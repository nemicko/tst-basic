const investors = [2, 20, 1, 5, 1, 4, 1, 2, 3, 3];
const investorsIn = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const investorsDuration = [4, 9, 3, 1, 2, 5, 7, 1, 4, 5];
const investorOut = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const iShared = [0, 0, 0, 0, 0, 0, 0, 0, 0];
let player = 0;

var totalCost = 30000000 * 50;
var tangibleTax = 5;
var contributionTax = 10;

var tax = (totalCost * tangibleTax) / 100;
var tangible = (tax * 10 * (100-contributionTax) * 10) / 10;
console.log(tangible);


class Tangible {

    filled: boolean = false;
    cap: number = 100;

    sharePool: number;
    tokenPool: number;

    balance: number = 0;

    tax: number = 10;

    tangibleAddress: number;

    index: number = 0;

    price: number = 1;

    holdings: Map<number, string> = new Map<number, string>();
    duration: Map<string, number> = new Map<string, number>();

    constructor() {
        this.sharePool = 100;
        this.tokenPool = 1000000;
    }

    purchase(amount: number, duration: number, address: number): boolean{

        const price = this.getPrice();

        this.duration.set(address, duration);
        this.sharePool -= amount;
        this.tokenPool += amount * price;
        investorsIn[address] = amount * price;
        this.holdings.set(address, amount);

        // remove for player
        player += (amount * price) * 0.1;
        this.tokenPool -= (amount * price) * 0.1

        /*
        player += (price * amount * 10 ) / 100;
        amount = amount - (amount * 10 ) / 100;
        */

        return true;
    }

    time: number = 0;

    tick(){
        this.time++;
    }

    getPrice(){
        return this.tokenPool / this.sharePool;
    }

    claim(address){
        if (!this.holdings.has(address))
            return false;
        if ((this.duration.get(address) - this.time) != 0)
            return false;

        investorOut[address] = this.holdings.get(address) * this.getPrice() * ( 1 + (this.duration.get(address) / 10));
        this.sharePool += this.holdings.get(address);
        this.tokenPool -= this.holdings.get(address) * this.getPrice() * (1 + (this.duration.get(address) / 10));
        this.holdings.delete(address);

        return true;
    }

    distribute(amount: number){
        this.tokenPool += amount;
    }

}

console.log("Investors", investors);
console.log("Players", player);

const t = new Tangible();
for(let i=0;i<10;i++){
    t.purchase(investors[i], investorsDuration[i], i);
    console.log(t.tokenPool, t.sharePool + " --- " + t.getPrice() + " || " + t.tokenPool);
}

t.distribute(2000);
t.distribute(2000);

let index = 0;
const res = [];
let sumPayIn = 0;
let sumPayOut = 0;
while(t.holdings.size > 0) {
    for (let i = 0; i < 10; i++) {
        //console.log(t.getPrice());
        if (t.claim(i)) {
            res.push({
                investor: i,
                in: investors[i],
                inp: parseInt(investorsIn[i].toFixed(0)),
                duration: investorsDuration[i],
                out: parseInt(investorOut[i].toFixed(0)),
                profit: parseInt((investorOut[i] - investorsIn[i]).toFixed(0)),
                pp: (parseInt(investorOut[i].toFixed(0)) - investors[i]) * investors[i] / 100
            })
            sumPayIn += parseInt(investorsIn[i].toFixed(0));
            sumPayOut += parseInt(investorOut[i].toFixed(0));
        }
        //console.log(t.getPrice());
    }
    t.tick();
    if (t.time == 3)
        t.distribute(2000);
    if (t.time == 5)
        t.distribute(2000);
}

res.sort((a, b) => a.profit - b.profit);

console.table(res);

console.log(t.sharePool);
console.log(t.tokenPool);
console.log("PayIn", sumPayIn);
console.log("PayOut", sumPayOut);
console.log("Player", player);

/*
console.log("Investors", investors);
console.log("Out", investorOut);
console.log("Balance", t.balance)
*/
