import { IPushAssociation, ITokenUpdate } from '../models';
import { AppConfig } from '../config';
import * as mongoose from 'mongoose';

class PushAssociationRepository {
  pushAssociation: mongoose.Model<mongoose.Document>;

  constructor() {
    mongoose
      .connect(
        AppConfig.mongoDBUrl,
        { useNewUrlParser: true }
      )
      .then(db => {
        let pushAssociationSchema = new db.Schema({
          user: {
            type: 'String',
            required: true
          },
          type: {
            type: 'String',
            required: true,
            enum: ['ios', 'android'],
            lowercase: true
          },
          token: {
            type: 'String',
            required: true
          },
          sub: {
            type: 'String',
            required: false
          }
        });

        // I must ensure uniqueness accross the two properties because two users can have the same token (ex: in apn, 1 token === 1 device)
        pushAssociationSchema.index({ user: 1, token: 1 }, { unique: true });

        this.pushAssociation = db.model('PushAssociation', pushAssociationSchema);
      })
      .catch(console.error);
  }

  update(association: IPushAssociation) {
    const query = { user: association.user };
    return this.pushAssociation.findOneAndUpdate(query, association, { upsert: true });
  }

  updateTokens(fromToArray: ITokenUpdate[]) {
    const promises: any[] = [];
    fromToArray.forEach(tokenUpdate => {
      promises.push(this.pushAssociation.findOneAndUpdate({ token: tokenUpdate.from }, { token: tokenUpdate.to }));
    });
    return Promise.all(promises);
  }

  getAll() {
    return this.pushAssociation.find().exec();
  }

  getDistinctUsersById() {
    return this.pushAssociation.distinct('sub').exec();
  }

  getForIds(subs: string[] = []) {
    return this.pushAssociation
      .where('sub')
      .in(subs)
      .exec();
  }

  getForId(sub: number) {
    return this.pushAssociation.find({ sub: sub });
  }

  getForUUIDs(uuids: string[] = []) {
    return this.pushAssociation
      .where('user')
      .in(uuids)
      .exec();
  }

  getForUUID(uuid: number) {
    return this.pushAssociation.find({ user: uuid });
  }

  removeUser(sub: string) {
    return this.pushAssociation.remove({ sub: sub });
  }

  removeUUID(uuid: string) {
    return this.pushAssociation.remove({ user: uuid });
  }

  removeToken(token: string) {
    return this.pushAssociation.remove({ token: token });
  }

  removeTokens(tokens: string[]) {
    return this.pushAssociation.remove({ token: { $in: tokens } });
  }
}

export const pushAssociationRepository = new PushAssociationRepository();
