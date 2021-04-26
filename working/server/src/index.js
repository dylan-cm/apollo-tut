require('dotenv').config();

const { ApolloServer } = require('apollo-server');
const isEmail = require('isemail');

const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const LaunchAPI = require('./datasources/launch');
const UserAPI = require('./datasources/user');

const admin = require('firebase-admin')
const serviceAccount = require('../apollo-tut-server-firebase-adminsdk-gj4aw-a959a42780.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore();

 findUser= async(email)=>{
  const users = await db
    .collection('users')
    .where('email', '==', email)
    .get()
    .then((snapshot) => snapshot.docs)

  var user = {}

  if (users && users.length){
    user = users[0].data()
    user.id = users[0].id;
    return user
  }
}

createUser=async(email)=>{
  const token = Buffer.from(email, 'ascii').toString('base64');
  
  const newUserId = await db
    .collection('users')
    .add({ email: email, token: token })
    .then((docRef) => docRef.id)

  const user = await db
    .collection('users')
    .doc(newUserId)
    .get()
    .then((doc) => {
      var userData = doc.data()
      userData.id = newUserId
      return userData;
    }) 
  if(user) {
    return user
  }
}

findOrCreateUser=async(email)=> {
  if (!email || !isEmail.validate(email)) return null;

  var user = await findUser(email)
  if(user) return user
  
  user = await createUser(email)
  if(user) return user

  throw new Error('Could not find or add user.')
}


// set up any dataSources our resolvers need
const dataSources = () => ({
  launchAPI: new LaunchAPI(),
  userAPI: new UserAPI({ db }),
});

// the function that sets up the global context for each resolver, using the req
const context = async ({ req }) => {
  // simple auth check on every request
  const auth = (req.headers && req.headers.authorization) || '';
  const email = Buffer.from(auth, 'base64').toString('ascii');
  // if the email isn't formatted validly, return null for user
  if (!isEmail.validate(email)) return { user: null };
  // find a user by their email
  // const users = await store.users.findOrCreate({ where: { email } });
  const user = await findOrCreateUser(email)

  return { user };
};

// Set up Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources,
  context,
  introspection: true,
  playground: true,
});


  server.listen().then(() => {
    console.log(`
      Server is running!
      Listening on port 4000
      Query at https://studio.apollographql.com/dev
    `);
  });

// export all the important pieces for integration/e2e tests to use
module.exports = {
  dataSources,
  context,
  typeDefs,
  resolvers,
  ApolloServer,
  LaunchAPI,
  UserAPI,
  db,
  server,
};
