const investors = [20, 40, 10, 20, 10, 0, 0, 0];
let player = 0;

class Tangible {

    filled: boolean = false;
    cap: number = 100;

    balance: number = 0;

    tax: number = 10;

    tangibleAddress: number;

    index: number = 0;

    holdings: Map<number, string> = new Map<number, string>();
    duration: Map<string, number> = new Map<string, number>();


    offers: Array<{
        price: number,
        amount: number,
        duration: number,
        address: number
    }> = [];

    purchase(amount: number, duration: number, address: number): boolean{
        if (this.filled)
            return false;

        this.balance += amount;
        player += (amount * 10 ) / 100;
        amount = amount - (amount * 10 ) / 100;

        investors[address] = 0;

        for(let i=0;i<amount;i++) {
            this.holdings.set(this.index, address);
            this.duration.set(this.index++, duration);
        }

        if (this.balance == this.cap){
            this.filled = true;
            console.log("Filled & active");
        }

        return true;
    }

    offer(price: number, amount: number, duration: number, address: number) {
        const buffer = [];
        let orgIndex = 0;
        for(let i=0;i<100;i++){
            if (this.offers[orgIndex]){
                if (this.offers[orgIndex].price > price || amount == 0){
                    buffer.push(this.offers[orgIndex]);
                    orgIndex++;
                } else if(amount != 0) {
                    buffer.push({ price: price, address: address, duration: duration });
                    amount--;
                }
            } else if (amount != 0){
                buffer.push({ price: price, address: address, duration: duration });
                amount--;
            }
        }
        this.offers = buffer;
    }

    swap(){
        let lowest = 0;
        let lowestIndex = 100;
        for(let i=0;i<100;i++){
           if (this.duration.get(i) < lowest){
                lowestIndex = i;
           }
        }
        if (lowestIndex != 100){
            const nw = this.offers.shift();

            if (nw) {
                investors[this.holdings.get(lowestIndex)] += nw.price;

                this.duration.set(lowestIndex, nw.duration);
                this.holdings.set(lowestIndex, nw.address);

                this.balance += nw.price;

                this.swap();
            }
        }
    }

    trigger(){
        for(let i=0;i<100;i++){
            this.duration.set(i,this.duration.get(i) - 1);
        }
    }

}

console.log("Investors", investors);
console.log("Players", player);

const t = new Tangible();
t.purchase(20, 1, 0);
t.purchase(40, 3, 1);
t.purchase(10, 5, 2);
t.purchase(20, 3, 3);
t.purchase(10, 2, 4);

t.offer(2, 20, 4, 5);
t.offer(1.5, 5, 4, 6);
t.offer(3, 2, 4, 7);

t.trigger();
t.trigger();
t.trigger();
t.trigger();

t.swap();

console.log("Investors", investors);
console.log("Players", player);
console.log("Balance", t.balance)
