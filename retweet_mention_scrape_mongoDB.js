let MongoClient = require('mongodb').MongoClient;
let axios = require('axios');

// MongoDB connection
const URI = // your mongoDB URI
const databaseName = // your mongoDB database
const collectionName = // name of your database collection

// Search Query
const start_time =  '2021-01-03T00:00:00Z'
const start_index = 0;
const max_results = 500;
const type = // retweets or mentions

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  }

MongoClient.connect(URI, { useUnifiedTopology: true }, (err, db) => {
    if (err) console.log(err);
    let database = db.db(databaseName);
    try{
        database.collection(collectionName).find().toArray(async (error, result) => {
            if (error) console.log(error);

            const instance = axios.create({
                baseURL: 'https://api.twitter.com/2/tweets/search/all',
                timeout: 5000,
                headers: {'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAAB%2BrPAEAAAAAhNdKEfhk7tVZBquq6Seh9gE%2Blzw%3DsRUdPuiHgf37zD1aZMGVbPCMjHvRnxgZr0kccFloxdOnEAA5cJ'},
                validateStatus: function (status) { return (status === 200 || status === 429) }
              });

            let i = 0;

            // 1. For each congressman 
            for (const twitterID of result) {
                i++;

                if (i < start_index) {
                    continue;
                }

                console.log(`${i}: ${twitterID}`)

                let tweets = []
                let status = 429
                let error = null;
                let next_token = null;

                let params = {
                    max_results,
                    start_time
                }

                params['tweet.fields'] = 'created_at';

                        console.log(`  The twitter ID is ${twitterID}`)
                        
                        let done = false

                        let type_dict = {
                            retweets: `from:${twitterID} is:retweet`,
                            mentions: `from:${twitterID} has:mentions -is:retweet`
                          };

                        params.query = type_dict[type];

                        // 3. Find all tweets until 
                        do {
                            sleep(1000);

                            await instance.get('', {params}).then((res) => {
                                if (res.data.data){
                                    for (const tweet of res.data.data) {
                                        tweets.push(tweet)
                                    }
                                }
            
                                status = res.status;

                                result_count = res.data.meta.result_count;                     
                                
                                next_token = res.data.meta.next_token;

                                done = true

                            }).catch(error => {
                                console.error(error);
                            })

                            console.log(`    The length of tweets are: ${tweets.length}`)
            
                            if (status === 429) {
                                console.log('Error: rate limit exceeds');
                                console.log('Sleeping for 1 seconds')
                                sleep(1000);
                                result_count = max_results;

                                done = false
                                continue;
                            }

                            if (status === 400) {
                                error = 400;
                                result_count = 0;

                                done = false
                                continue;
                            }

                            if (next_token){
                                params.next_token = next_token
                                done = false
                            }

                        } while (!done);

                if (type === 'retweets') {
                    let newvalues = { $set: {retweets: tweets, error}}
                }
                if (type === 'mentions') {
                    let newvalues = { $set: {mentions: tweets, error}}
                }

                database.collection(collectionName).updateOne({ name: twitterID.name }, newvalues, { upsert: true }, function (err, res) {
                  if (err) throw err;
                })
            }
        })
    } catch(error){console.error(error)}
})