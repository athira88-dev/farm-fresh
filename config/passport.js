const passport=require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema'); // your Mongoose user model
const env=require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // First, try finding by email
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // If user exists but doesn't have googleId, update it
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
        return done(null, user);
      }

      // Else, create new user
      user = new User({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
      });
      await user.save();
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));


passport.serializeUser((user, done) => {
  done(null, user.id);    // store user id in session
});

passport.deserializeUser(async (id, done) => {

   User.findById(id).then(user=>{done(null,user)}).catch(err=>{done(err,null)})
    // make user available on req.user

  });

  module.exports=passport