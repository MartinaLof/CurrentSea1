const express = require('express');
const debug = require('debug')('app:userAccountsRoutes');
const passport = require('passport');
const db = require('./db');
const { validateEmail, MD5 } = require('./validationHelperMethods/account');

const userAccountRouter = express.Router();


module.exports = function router() {
  // UserAccount Flows
  userAccountRouter.route('/')
    .get((req, res) => {
      // Render respective html, ejs, or pug
      res.send('Accounts');
      db.query('SELECT * FROM user_table where ut_user_id = "Test2" ', (err, results, fields) => {
        if (err) res.send(err);
        debug(results.length);
      });
    });

  userAccountRouter.route('/register')
    .post((req, res) => {
      const {
        username, firstName, lastName, emailID, password, confirmPassword,
      } = req.body;
      if (password === '') {
        res.status(401).json({ message: 'No password entered' });
      }
      if (password !== confirmPassword) {
        res.status(401).json({ message: 'Passwords do not match' });
      }
      if (!validateEmail(emailID)) {
        res.status(401).json({ message: 'Invalid email' });
      } else {
        db.query('SELECT ut_user_id FROM user_table WHERE ut_email=? OR ut_user_id=?', [emailID], username, (err, results, fields) => {
          if (err) res.status(500).json({ message: 'Server error' });
          if (results.length === 0) {
            db.query('INSERT INTO user_table (ut_user_id, ut_password, ut_first_name, ut_last_name, ut_email) VALUES (?, ?, ?, ?, ?)',
              [username, MD5(username + password), firstName, lastName, emailID],
              (err, results3, fields) => {
                if (err) res.status(500).json({ message: 'Server error' });
                res.status(201).send({ userID: username });
              });
          } else {
            res.status(401).json({ message: 'Email or username already exits' });
          }
        });
      }
    });

  userAccountRouter.route('/login')
    .post((req, res, next) => {
      if (req.user) res.status(200).json({message: 'User already logged in' });
      passport.authenticate('local', (err, user, info) => {
        if (err) return res.status(500).json({ message: 'Server error' });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        req.login(user, (err2) => {
          if (err2) return res.status(500).json({ message: 'Server error' });
          return res.status(200).json({ message: 'user authenticated' });
        });
      })(req, res, next);
    });

  userAccountRouter.route('/logout')
    .get((req, res) => {
      req.logout();
      res.redirect('/');
    });

  userAccountRouter.route('/change_password')
    .post((req, res, next) => {
      passport.authenticate('local', (err, user, info) => {
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        const { utEmail, newPassword, confirmPassword } = req.body;
        if (confirmPassword === newPassword) {
          db.query('UPDATE user_table SET ut_password = ? WHERE ut_email = ? AND ut_user_id = ?', [
            MD5(user.utUserId + user.newPassword), utEmail, user.utUserId], (results) => {
              debug(results);
            });
        } else {
          res.status(401).json({ message: 'Please ensure that your confirming password matches your new password.' });
        }
      })(req, res, next);
    });

  userAccountRouter.route('/loggedin').get((req, res) => {
    if (req.user) {
      res.status(200).json({ message: 'OK' });
    } else {
      res.status(200).json({ message: 'NOK' });
    }
  });
  return userAccountRouter;
};
