const passport=require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema'); // your Mongoose user model
const env=require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  '/auth/google/callback'},
   async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create the user
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        return done(null, user);
      }else{
        user = new User({
          googleId:    profile.id,
          name:        profile.displayName,
          email:       profile.emails[0].value,
          // you can also store profile.photos[0].value for avatar
        });
        await user.save()
        return done(null, user);
      }
    }
    catch(err) {
       return done(err,null);
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