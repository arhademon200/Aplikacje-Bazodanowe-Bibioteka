const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const Books = require('./models/books');
const Users = require('./models/users');
const initializePassport = require('./passport-config');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

mongoose.connect('mongodb://localhost:27017/test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Could not connect to MongoDB', err);
});

const app = express();
initializePassport(
  passport,
  async email => await Users.findOne({ email }),
  async id => await Users.findById(id)
);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(flash());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

app.get('/', checkAuthenticated, async (req, res) => {
  try {
    const books = await Books.find().populate('borrower');
    res.render('index', { name: req.user.name, userId: req.user._id, books });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login');
});

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register');
});

app.get('/books/new', checkAuthenticated, (req, res) => {
  res.render('new-book');
});

app.post('/books', checkAuthenticated, async (req, res) => {
  try {
    const newBook = new Books({
      title: req.body.title,
      year: req.body.year,
      author: req.body.author
    });

    await newBook.save();
    res.redirect('/');
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/books/:id/edit', checkAuthenticated, async (req, res) => {
  try {
    const book = await Books.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.render('edit-book', { book });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/books/:id', checkAuthenticated, async (req, res) => {
  try {
    const book = await Books.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    book.title = req.body.title || book.title;
    book.year = req.body.year || book.year;
    book.author = req.body.author || book.author;

    await book.save();
    res.redirect('/');
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/books/:id', checkAuthenticated, async (req, res) => {
  try {
    const book = await Books.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    await book.remove();
    res.redirect('/');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/books/:id/borrow', checkAuthenticated, async (req, res) => {
  try {
    const book = await Books.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.isborrowed) {
      return res.status(400).json({ message: 'Book already borrowed' });
    }

    book.isborrowed = true;
    book.borrower = req.user._id;

    await book.save();
    res.redirect('/');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/books/:id/return', checkAuthenticated, async (req, res) => {
  try {
    const book = await Books.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (!book.isborrowed || book.borrower.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot return this book' });
    }

    book.isborrowed = false;
    book.borrower = null;

    await book.save();
    res.redirect('/');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const existingUser = await Users.findOne({ email: req.body.email });
    if (existingUser) {
      return res.redirect("/register");
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUser = new Users({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    });

    await newUser.save();
    res.redirect('/login');
  } catch {
    res.redirect('/register');
  }
});

app.delete('/logout', (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/login');
  });
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
