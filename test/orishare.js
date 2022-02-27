const OriShare = artifacts.require("OriShare");
const OriToken = artifacts.require("OriToken");

contract('OriShare', (accounts) => {

    it('should put 7500000 OriToken in the first account', async () => {
        const metaCoinInstance = await OriToken.deployed();
        const balance = await metaCoinInstance.balanceOf.call(accounts[0]);

        assert.isTrue(balance.valueOf() > 0, "To less in origin token");
    });

    it('Transfer some Ori to all bidders', async () => {
        const oriToken = await OriToken.deployed();

        // Setup 2 accounts.
        const accountOne = accounts[0];

        // Make transaction from first account to second.
        for(let i=2;i<10;i++) {
            const amount = 40000000000;
            await oriToken.transfer(accounts[i], amount, {from: accountOne});
        }

        // Get balances of first and second account after the transactions.
        const accountOneEndingBalance = (await oriToken.balanceOf.call(accountOne)).toNumber();

        // send back
        assert.equal(accountOneEndingBalance, 430000000000, "Failed to transfer funds");
    });

    it('Setup Tangible', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        await oriToken.approve(oriShare.address, 3000000000, { from: accounts[0] });
        await oriShare.setTangible(accounts[1], {from : accounts[0]} );
        await oriShare.initalize(3000000000, { from: accounts[0] });

        const price = (await oriShare.getPrice.call()).toNumber();
        const balance = (await oriShare.getBalance.call()).toNumber();
        const fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();

        assert.equal(price, 30000000, "Invalid price on initialized tangible");
        assert.equal(balance, 3000000000, "Invalid balance on initialized tangible");
        assert.equal(fundsTangible, 3000000000, "Invalid funds on initialized tangible");
    })

    it('Bid', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        // submit bid
        const escrow = 1500000000 + (1500000000 * 0.05);
        await oriToken.approve(oriShare.address, escrow, { from: accounts[2] });
        await oriShare.bid(30000000, 50, {from: accounts[2]});

        // tangible funds should increase
        const fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        assert.equal(fundsTangible, 4575000000, "Invalid funds after bid");

        const offers = await oriShare.getOffers.call();
        assert.equal(offers.length, 1, "Offer not stored");
        assert.equal(offers[0].price, 30000000, "Offer has invalid price");
    });

    it('Accept offer (A)', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        // fetch offers
        const offers = await oriShare.getOffers.call();
        await oriShare.accept(offers[0].from, 50, { from: accounts[0] });

        // check if root got funds back
        const fundsPlayer = (await oriToken.balanceOf(accounts[1])).toNumber();
        assert.equal(fundsPlayer, 67500000, "Invalid funds on player after bid");

        const fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        assert.equal(fundsTangible, 3007500000, "Invalid funds on tangible after accept");

        const balance = (await oriShare.getBalance.call()).toNumber();
        assert.equal(fundsTangible, balance, "Funds and balance should be same");

        const price = (await oriShare.getPrice.call()).toNumber();
        assert.equal(price, 30075000, "Invalid price, in PreSale phase");

        const share = (await oriShare.getShare.call(accounts[2])).toNumber();
        assert.equal(share, 50, "Invalid share of staker");
    })

    it('Check if offers been closed', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        const offers = await oriShare.getOffers.call();
        assert.equal(offers.length, 0, "Bought offer not closed");

        const sharedholders = await oriShare.getShareholders.call();
        assert.equal(sharedholders.length, 2, "New shareholder not included in shareholders");
    });

    it('Add more bids', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        const price = (await oriShare.getPrice.call()).toNumber();

        // submit bid
        await createBid(20, price, accounts[3]);
        await createBid(10, price * 1.5, accounts[4]);
        await createBid(20, price * 2, accounts[5]);
        await createBid(20, price * 0.5, accounts[6]);

        // tangible funds should increase
        const fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        assert.equal(fundsTangible, 5691693750, "Invalid funds after bid");

        const offers = await oriShare.getOffers.call();
        assert.equal(offers.length, 4, "Offer not stored");
        assert.equal(offers[3].price, 15037500, "Offer has invalid price");
    })

    it('Accept bids', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        let fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        let fundsPlayer = (await oriToken.balanceOf.call(accounts[1])).toNumber();
        let fundsOwner = (await oriToken.balanceOf.call(accounts[0])).toNumber();
        let value = (await oriShare.getBalance.call()).toNumber();
        let earningOnwer = 0;

        // fetch offers
        const offers = await oriShare.getOffers.call();
        await oriShare.accept(offers[0].from, 20, { from: accounts[0] });

            fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
            value = (await oriShare.getBalance.call()).toNumber();
            fundsPlayer = (await oriToken.balanceOf.call(accounts[1])).toNumber();
            earningOnwer += ((await oriToken.balanceOf.call(accounts[0])).toNumber() - fundsOwner);
            fundsOwner = (await oriToken.balanceOf.call(accounts[0])).toNumber();
            assert.equal(fundsPlayer, 94567500, "Invalid tax paid to player");

        await oriShare.accept(offers[1].from, 10, { from: accounts[0] });

            fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
            value = (await oriShare.getBalance.call()).toNumber();
            fundsPlayer = (await oriToken.balanceOf.call(accounts[1])).toNumber();
            earningOnwer += ((await oriToken.balanceOf.call(accounts[0])).toNumber() - fundsOwner);
            fundsOwner = (await oriToken.balanceOf.call(accounts[0])).toNumber();
            assert.equal(fundsPlayer, 114868125, "Invalid tax paid to player");

        await oriShare.accept(offers[2].from, 20, { from: accounts[0] });

            fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
            value = (await oriShare.getBalance.call()).toNumber();
            fundsPlayer = (await oriToken.balanceOf(accounts[1])).toNumber();
            earningOnwer += ((await oriToken.balanceOf.call(accounts[0])).toNumber() - fundsOwner);
            fundsOwner = (await oriToken.balanceOf.call(accounts[0])).toNumber();
            assert.equal(fundsPlayer, 169003125, "Invalid funds on player after bid");


        fundsTangible = (await oriToken.balanceOf.call(accounts[0])).toNumber();
        const total = 43000000000 + 3755625000;
        //assert.equal(fundsTangible, total, "Invalid funds on tangible after accept");
    });

    it('Accept bid, which is lower then price', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        let fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        let fundsPlayer = (await oriToken.balanceOf.call(accounts[1])).toNumber();
        let fundsOwner = (await oriToken.balanceOf.call(accounts[2])).toNumber();
        let value = (await oriShare.getBalance.call()).toNumber();

        // accept offer
        const offers = await oriShare.getOffers.call();
        await oriShare.accept(offers[0].from, 10, { from: accounts[2] });

        let fundsTangibleAfter = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        assert.equal(fundsTangibleAfter, 3177423750, "Invalid funds on tangible");

        let fundsPlayerAfter = (await oriToken.balanceOf.call(accounts[1])).toNumber();
        assert.equal(fundsPlayerAfter, 175770000, "Invalid funds on tangible");

        let fundsOwnerAfter = (await oriToken.balanceOf.call(accounts[2])).toNumber();
        assert.equal(fundsOwnerAfter, 38575375000, "Invalid funds on tangible");

        let valueAfter = (await oriShare.getBalance.call()).toNumber();
        assert.equal(valueAfter, 3019530000, "Invalid funds on tangible");
    });

    it('Cancel offer, and get escrow back', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        const offers = await oriShare.getOffers.call();

        let fundsTangible = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        let fundsOwner = (await oriToken.balanceOf.call(accounts[6])).toNumber();

        // has 10 amount left in offer
        await oriShare.cancel({ from: accounts[6] });

        let fundsTangibleAfter = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        let fundsOwnerAfter = (await oriToken.balanceOf.call(accounts[6])).toNumber();

        assert.equal(fundsTangibleAfter, 3019530000, "Escrow not returned");
    });

    it('Disburse funds', async() => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        await oriToken.approve(oriShare.address, 100000000, { from: accounts[0] })
        await oriShare.disburse(100000000, { from: accounts[0] } );

        const fundsTangibleAfter = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        const value = (await oriShare.getBalance.call()).toNumber();
        const price = (await oriShare.getPrice.call()).toNumber();

        assert.equal(fundsTangibleAfter, 3119530000, "Disburse failed");
        assert.equal(fundsTangibleAfter, value, "Disburse failed");
        assert.equal(price, 31195300, "Disburse failed");
    })

    it('Terminate Share', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        // check all holders
        const shares  =[];
        const shareholders = await oriShare.getShareholders.call();
        for(let share of shareholders)
            shares.push((await oriToken.balanceOf.call(share)).toNumber());

        // terminate
        await oriShare.terminate({ from: accounts[0] });

        // check balances in share
        const fundsTangibleAfter = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        assert.equal(fundsTangibleAfter, 0, "Tangible shouldn't have anymore funds");

        let index = 0;
        for(let share of shareholders){
            const balance = (await oriToken.balanceOf.call(share)).toNumber();
            const before = shares[index];
            console.log(balance - before);
        }

        console.log("done");
    });

});

const createBid = async (percent, price, address) => {
    const oriToken = await OriToken.deployed();
    const oriShare = await OriShare.deployed();

    // submit bid
    let escrow = price * percent;
    escrow = escrow + (escrow * 0.05)
    await oriToken.approve(oriShare.address, escrow, { from: address });
    await oriShare.bid(price, percent, {from: address});
}
