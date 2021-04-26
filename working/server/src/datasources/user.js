const { DataSource } = require('apollo-datasource');
const isEmail = require('isemail');

class UserAPI extends DataSource {
  constructor({db}) {
    super();
    this.db = db;
  }

  initialize(config) {
    this.context = config.context;
  }

  async findUser(email){
    const users = await this.db
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
  
  async createUser(email){
    const token = Buffer.from(email, 'ascii').toString('base64');
    
    const newUserId = await this.db
      .collection('users')
      .add({ email: email, token: token })
      .then((docRef) => docRef.id)

    const user = await this.db
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

  async findOrCreateUser(emailArg) {
    const email =
      this.context && this.context.user ? this.context.user.email : emailArg;
    if (!email || !isEmail.validate(email)) return null;

    var user = await this.findUser(email)
    if(user) return user
    
    user = await this.createUser(email)
    if(user) return user

    throw new Error('Could not find or add user.')
  }

  async bookTrips({ launchIds }) {
    let results = [];
    if(!this.context.user) return results

    for (const launchId of launchIds) {
      const res = await this.bookTrip({ launchId });
      if (res) results.push(res);
    }

    return results;
  }

  async bookTrip({ launchId }) {
    const userId = this.context.user.id;
    if (!userId) return;

    const res = await this.db
      .collection('trips')
      .add({
        userId: userId,
        launchId: launchId,
      })
      .then((_)=> launchId)
      .catch((_)=>{
        return false
      })
      
    return res
  }

  async cancelTrip({ launchId }) {
    const userId = this.context.user.id;
    await this.db
    .collection('trips')
      .where('userId', '==', userId)
      .where('launchId', '==', launchId)
      .get()
      .then((snapshot)=>{
        snapshot.forEach((trip) =>{
          this.db.collection('trips').doc(trip.id).delete()
        })
      })
    return [];
  }

  async getLaunchIdsByUser() {
    const userId = this.context.user.id;
    const launches = []
    await this.db
      .collection('trips')
      .where('userId', '==', userId)
      .get()
      .then((snapshot) => {
        snapshot.forEach(doc => {
          launches.push(doc.data())
        });
      })
    return launches && launches.length
      ? launches.map(launch => launch.launchId)
      : [];
  }

  async isBookedOnLaunch({ launchId }) {
    if (!this.context || !this.context.user) return false;
    const userId = this.context.user.id;
    const launches = []
    await this.db
      .collection('trips')
      .where('userId', '==', userId)
      .where('launchId', '==', launchId.toString())
      .get()
      .then((snapshot) => {
        snapshot.forEach(doc => {
          launches.push(doc.data())
        });
      })
    return launches && launches.length > 0;
  }
}

module.exports = UserAPI;
