import express from 'express';

const app = express();
const router = express.Router();

const protect = (req, res, next) => {
    console.log('originalUrl:', req.originalUrl);
    console.log('baseUrl:', req.baseUrl);
    console.log('path:', req.path);
    res.send('ok');
};

router.get('/download/:id', protect);
app.use('/api/materials', router);

app.listen(3000, async () => {
    const fetch = await import('node-fetch');
    const res = await fetch.default('http://localhost:3000/api/materials/download/123?token=abc');
    console.log(await res.text());
    process.exit(0);
});