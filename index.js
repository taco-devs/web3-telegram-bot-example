const http = require('http');
const Web3 = require('web3');
const TelegramBot = require('node-telegram-bot-api');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Server res');
});

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TOKEN;
const channel_id = process.env.CHANNEL_ID;
// Create a bot that uses 'polling' to fetch new updates

const bot = new TelegramBot(token, {polling: true});

function pad(n) {
    var s = "000" + n;
    return s.substr(s.length-4);
}


// Topics
// 0x5b859394fabae0c1ba88baffe67e751ab5248d2e879028b8c8d6897b0519f56a - EnterBidForPunk
// 0x3c7b682d5da98001a9b8cbda6c647d2c63d698a4184fd1d55e2ce7b66f5d21eb - Offer For Sale
// 0x58e5d5a525e3b40bc15abaa38b5882678db1ee68befd2f60bafe3a7fd06db9e3 - Punk Bought

const BID_TOPIC = '0x5b859394fabae0c1ba88baffe67e751ab5248d2e879028b8c8d6897b0519f56a'
const OFFER_TOPIC = '0x3c7b682d5da98001a9b8cbda6c647d2c63d698a4184fd1d55e2ce7b66f5d21eb'
const BUY_TOPIC = '0x58e5d5a525e3b40bc15abaa38b5882678db1ee68befd2f60bafe3a7fd06db9e3'
const BID_WITHDRAWN = '0x6f30e1ee4d81dcc7a8a478577f65d2ed2edb120565960ac45fe7c50551c87932'
const TRANSFER = '0x05af636b70da6819000c49f85b21fa82081c632069bb626f30932034099107d8'

const getEvent = async (web3, log) => {
    if (log.topics.indexOf(BID_TOPIC) > -1) {
        // Topics [1] = ID
        // Topics [2] = Offer to (If is zero is offered to everyone)
        // data = minValue
        const bid = web3.eth.abi.decodeLog([
            { indexed: true, name: "punkIndex", type: "uint256" },
            { indexed: false, name: "value", type: "uint256" },
            { indexed: true, name: "fromAddress", type: "address" },
        ], log.data, [log.topics[1], log.topics[2]])
        console.log(`New bid ${Math.round(bid.value / 1e18 * 100) / 100} BNB for Bunk ${bid.punkIndex} ${log.transactionHash}`)

        
        await bot.sendPhoto(channel_id,`https://larvalabs.com/public/images/cryptopunks/punk${pad(bid.punkIndex)}.png`, 
            { 
                caption: `
                    🏁 New bid \ ${Math.round(bid.value / 1e18 * 100) / 100} \ BNB for Bunk ${pad(bid.punkIndex)}
                    [Show TX](https://bscscan.com/tx/${log.transactionHash}) 
                ` ,
                parse_mode: 'Markdown'
            }
        )
    }
    if (log.topics.indexOf(OFFER_TOPIC) > -1) {
        // Topics [1] = ID
        // Topics [2] = From Address (If is zero is offered to everyone)
        // data = minValue
        const offer = web3.eth.abi.decodeLog([
            { indexed: true, name: "punkIndex", type: "uint256" },
            { indexed: false, name: "minValue", type: "uint256" },
            { indexed: true, name: "toAddress", type: "address" },
          ], log.data, [log.topics[1], log.topics[2]])

        console.log(`Bunk #${offer.punkIndex} has been offered for \ ${Math.round(offer.minValue / 1e18 * 100) / 100} \ BNB ${log.transactionHash}`)
        if (offer.punkIndex === 5412) return;
        await bot.sendPhoto(channel_id, `https://larvalabs.com/public/images/cryptopunks/punk${pad(offer.punkIndex)}.png`, 
            { caption: `
                Bunk ${pad(offer.punkIndex)} has been offered \ for ${Math.round(offer.minValue / 1e18 * 100) / 100} \ BNB
                [Show TX](https://bscscan.com/tx/${log.transactionHash}) 
            ` ,
            parse_mode: 'Markdown'}
        )
    }
    if (log.topics.indexOf(BUY_TOPIC) > -1) {
        // Topics [1] = ID
        // Topics [2] = Sold By
        // Topics [3] = To Address
        // data = minValue
        const buy = web3.eth.abi.decodeLog(        [
            { indexed: true, name: "punkIndex", type: "uint256" },
            { indexed: false, name: "value", type: "uint256" },
            { indexed: true, name: "fromAddress", type: "address" },
            { indexed: true, name: "toAddress", type: "address" },
        ], log.data, [log.topics[1], log.topics[2], log.topics[3]])

        const value = Number(buy.value);

        if (value > 0) {
            console.log(`Bunk ${buy.punkIndex} has been bought for ${Math.round(buy.value / 1e18 * 100) / 100} BNB ${log.transactionHash}`)
            await bot.sendPhoto(channel_id, `https://larvalabs.com/public/images/cryptopunks/punk${pad(buy.punkIndex)}.png`, {
                caption: `
                    🟢 Bunk ${pad(buy.punkIndex)} has been bought for \ ${Math.round(buy.value / 1e18 * 100) / 100}\ BNB
                    [Show TX](https://bscscan.com/tx/${log.transactionHash}) 
                    `,
                parse_mode: 'Markdown'
            })
        } else {
            console.log(`Bid for Bunk #${buy.punkIndex} has been accepted ${log.transactionHash}`);
            await bot.sendPhoto(channel_id, `https://larvalabs.com/public/images/cryptopunks/punk${pad(buy.punkIndex)}.png`, {
                caption: `
                    🟢 Bid for Bunk ${pad(buy.punkIndex)} has been accepted
                    [Show TX](https://bscscan.com/tx/${log.transactionHash})
                `,
                parse_mode: 'Markdown'
            })
        }
    }
    if (log.topics.indexOf(BID_WITHDRAWN) > -1) {
        // Topics [1] = ID
        // Topics [2] = Sold By
        // Topics [3] = To Address
        // data = minValue
        const bid_withdraw = web3.eth.abi.decodeLog([
            { indexed: true, name: "punkIndex", type: "uint256" },
            { indexed: false, name: "value", type: "uint256" },
            { indexed: true, name: "fromAddress", type: "address" },
          ], log.data, [log.topics[1], log.topics[2]])
        console.log(`Bid for Bunk ${bid_withdraw.punkIndex} (${Math.round(bid_withdraw.value / 1e18 * 100) / 100} BNB) has been withdrawn ${log.transactionHash}`)
        await bot.sendPhoto(channel_id, `https://larvalabs.com/public/images/cryptopunks/punk${pad(bid_withdraw.punkIndex)}.png`, {
            caption: `
                🛑 Bid for Bunk \ ${pad(bid_withdraw.punkIndex)} ${Math.round(bid_withdraw.value / 1e18 * 100) / 100} \ BNB has been withdrawn
                [Show TX](https://bscscan.com/tx/${log.transactionHash}) 
            `,
            parse_mode: 'Markdown'
        })
        // bot.sendMessage(channel_id, );
    }
    if (log.topics.indexOf(TRANSFER) > -1) {
        // Topics [1] = ID
        // Topics [2] = Sold By
        // Topics [3] = To Address
        // data = minValue
        const transfer = web3.eth.abi.decodeLog([
            { indexed: true, name: "from", type: "address" },
            { indexed: true, name: "to", type: "address" },
            { indexed: false, name: "value", type: "uint256" },
          ], log.data, [log.topics[1], log.topics[2]])
        console.log(transfer);
    }
    
}

const eventListener = async () => {
    const web3 = new Web3('wss://bsc-ws-node.nariox.org:443');

    let subscription;

    subscription = await web3.eth.subscribe('logs', {
        address: '0x5ea899dbc8d3cde806142a955806e06759b05fb8',
        //topics: [BID_TOPIC, OFFER_TOPIC, BUY_TOPIC],
    })
    .on("connected", function(subscriptionId){
        console.log('connected: ', subscriptionId);
    })
    .on("data", function(log){
        getEvent(web3, log);
    })
    .on("changed", function(log){
    })
    .on("error", async (e) => {
        console.log('Disconnected');
        await subscription.unsubscribe();
        eventListener();
    })
   
    
}


server.listen(port, hostname, async () => {

    eventListener();

});

