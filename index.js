const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

// Middlewares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zusdhlj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        const serviceCollection = client.db('lawyerReview').collection('services');
        const reviewsCollection = client.db('lawyerReview').collection('reviews');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        app.get('/services', async (req, res) => {
            const dataSize = req.query.datasize;
            const query = {};
            const cursor = serviceCollection.find(query).limit(parseInt(dataSize));
            const services = await cursor.toArray();
            res.send(services);
        });

        app.post('/services', async (req, res) => {
            const service = req.body;
            const result = await serviceCollection.insertOne(service);
            res.send(result);
        })

        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await serviceCollection.findOne(query);
            res.send(service);
        })

        //reviews api
        app.get('/service-reviews/:serviceID', async (req, res) => {
            const serviceID = req.params.serviceID;
            const query = { service_id: serviceID };
            const cursor = reviewsCollection.find(query).sort({ review_date: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        app.get('/user-reviews/:userID', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userID = req.params.userID;
            if (decoded.uid !== userID) {
                res.status(403).send({ message: 'unauthorized access' });
            }
            const query = { 'reviewer_info.userID': userID };
            const cursor = reviewsCollection.find(query).sort({ review_date: -1 });
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        })

        app.patch('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const updateReviewData = req.body;
            const query = { _id: ObjectId(id) };
            const updatedReview = {
                $set: updateReviewData

            }
            const result = await reviewsCollection.updateOne(query, updatedReview);
            res.send(result);
        })

        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await reviewsCollection.deleteOne(query);
            res.send(result);
        })

    }
    finally {

    }

}

run().catch(err => console.log(err));

app.get('/', (req, res) => {
    res.send('Hello From Node Mongo Server');
})

app.listen(port, () => {
    console.log(`Listening to port ${port}`);
})