const OriShare = artifacts.require("OriShare");
const OriToken = artifacts.require("OriToken");

contract('OriShare', (accounts) => {

    it('should put 75000000 OriToken in the first account', async () => {
        const metaCoinInstance = await OriToken.deployed();
        const balance = await metaCoinInstance.balanceOf.call(accounts[0]);

        assert.isTrue(balance.valueOf() > 0, "To less in origin token");
    });

    it('Transfer some Ori to second account', async () => {
        const oriToken = await OriToken.deployed();

        // Setup 2 accounts.
        const accountOne = accounts[0];
        const accountTwo = accounts[1];

        // Get initial balances of first and second account.
        const accountOneStartingBalance = (await oriToken.balanceOf.call(accountOne)).toNumber();
        const accountTwoStartingBalance = (await oriToken.balanceOf.call(accountTwo)).toNumber();

        // Make transaction from first account to second.
        const amount = 20;
        await oriToken.transfer(accountTwo, amount, {from: accountOne});

        // Get balances of first and second account after the transactions.
        const accountOneEndingBalance = (await oriToken.balanceOf.call(accountOne)).toNumber();
        const accountTwoEndingBalance = (await oriToken.balanceOf.call(accountTwo)).toNumber();

        assert.equal(accountOneEndingBalance, accountOneStartingBalance - amount, "Amount wasn't correctly taken from the sender");
        assert.equal(accountTwoEndingBalance, accountTwoStartingBalance + amount, "Amount wasn't correctly sent to the receiver");

        // send back
        await oriToken.transfer(accountOne, amount, {from: accountTwo});
    });

    it('Investing and distribution', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        const investors = {};
        investors[accounts[2]] = 100;
        investors[accounts[3]] = 100;
        investors[accounts[4]] = 100;
        investors[accounts[5]] = 100;
        investors[accounts[6]] = 100;
        investors[accounts[7]] = 100;
        investors[accounts[8]] = 100;
        investors[accounts[9]] = 100;

        // set player
        await oriShare.setPlayer(accounts[1]);
        const playerBalanceBefore = (await oriToken.balanceOf.call(accounts[1])).toNumber();
        assert.equal(playerBalanceBefore, 0, "Player should have 0 ORI")

        // distribute tokens
        for(let i=2;i<10;i++)
          await oriToken.transfer(accounts[i], 100, {from: accounts[0]});

        // invests
        for(let i=2;i<10;i++) {
          await await oriToken.approve(oriShare.address, 100, { from: accounts[i] });
          await await oriShare.invest(100, 10, { from: accounts[i] });
        }

        // shares
        const shares = [112, 92, 88, 85, 84, 83, 82, 81];
        for(let i=2;i<10;i++) {
            const balance = (await oriShare.getShare.call(accounts[i])).toNumber();
            assert.equal(shares[i-2], balance);
        }

        // check balance
        const shareBalance = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        assert.equal(shareBalance, 720, "Total locked in amount to be 720 (800-80)");

        // check balance in oriShare
        const shareBalanceInside = (await oriShare.getBalance.call()).toNumber();
        assert.equal(shareBalanceInside, 720, "Total locked in amount to be 720 (800-80)");

        // player
        const playerBalance = (await oriToken.balanceOf.call(accounts[1])).toNumber();
        assert.equal(playerBalance, 80, "Player should earn 80 ORI")

    })

    it('Claim shares', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        // check shares to be claimed
        let shares = (await oriShare.getShare.call(accounts[2])).toNumber();
        assert.equal(shares, 112, "Investor should have 112 investments");

        // balance before claim
        accBalance = (await oriToken.balanceOf.call(accounts[2])).toNumber();
        assert.equal(accBalance, 0, "Investor should have 0 in his wallet");

        // after claim
        await oriShare.claim({ from: accounts[2] });

        // investor should have no shares left
        shares = (await oriShare.getShare.call(accounts[2])).toNumber();
        assert.equal(shares, 0, "Investor should not have any shares");

        // balance after claim
        accBalance = (await oriToken.balanceOf.call(accounts[2])).toNumber();
        assert.equal(accBalance, 112, "Investor should have 113 in his wallet");

        // left balance in share
        const shareBalance = (await oriToken.balanceOf.call(oriShare.address)).toNumber();
        assert.equal(shareBalance, 608, "Shared poll should be now 608");

        const investorCount = (await oriShare.getInvestorCount.call()).toNumber();
        assert.equal(investorCount, 7, "Investor count should be 7");

    });

    it('Terminate Share', async () => {
        const oriToken = await OriToken.deployed();
        const oriShare = await OriShare.deployed();

        await oriShare.terminate({ from: accounts[0] });

        // check balances in share
        shares = (await oriShare.getBalance.call()).toNumber();
        assert.equal(shares, 0, "Investor should not have any shares");

        const investorCount = (await oriShare.getInvestorCount.call()).toNumber();
        assert.equal(investorCount, 0, "Investor count should be 0");
    });



});
