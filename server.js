const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const rn = require('random-number');
const url = require('url');
const dns = require('dns');
const dotenv = require('dotenv').config();

const app = express();
const port = process.env.PORT;
const mongoDB = process.env.MONGOLAB_URI;

app.use(cors({ optionSuccessStatus: 200 }));  // some legacy browsers choke on 204
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(path.join(__dirname, '/public')));

// Database connection setup
mongoose.connect(mongoDB);
const db = mongoose.connection;
db.on('error', (err) => { console.log('Mongo DB connection error', err); });
db.once('open', () => { console.log('Mongo DB connected.'); });

// Schema setup
const Schema = mongoose.Schema;
const urlSchema = new Schema({
  url: String,
  short: Number,
}, {
  timestamps: true,
});
const UrlModel = mongoose.model('url', urlSchema);

function addhttp(url) {
  let newUrl = url;
  if (!/^(?:f|ht)tps?\:\/\//.test(url)) {
    newUrl = 'http://'.concat(url);
  }
  return newUrl;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/views/index.html'));
});

app.get('/api/shorturl/:id', (req, res) => {
  if (isNaN(req.params.id)) {
    res.redirect('/');
  } else {
    const shortUrl = Number(req.params.id);

    UrlModel.findOne({ short: shortUrl }, (err, data) => {
      if (err) console.log(err);
      else if (data) {
        res.redirect(addhttp(data.url));
      } else {
        res.redirect('/');
      }
    });
  }
});

app.post('/api/shorturl/new', (req, res) => {
  const originalUrl = req.body.url;
  const parsedUrl = url.parse(addhttp(originalUrl));

  dns.lookup(parsedUrl.host, (err, address) => {
    if (address === undefined) {
      res.json({ error: 'invalid URL' });
    } else {
      const gen = rn.generator({
        min: 1000,
        max: 99999,
        integer: true,
      });

      const shortUrl = gen();

      const newUrl = new UrlModel({
        url: originalUrl,
        short: shortUrl,
      });

      newUrl.save((errSave) => {
        if (errSave) console.log(errSave);
        else {
          res.json({ original_url: originalUrl, short_url: shortUrl });
        }
      });
    }
  });
});

const listener = app.listen(port, () => {
  console.log('Your app is listening on port '.concat(listener.address().port));
});
