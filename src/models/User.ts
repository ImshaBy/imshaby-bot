import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
    _id: string;
    created: number;
    username: string;
    email: string;
    name: string;
    observableParishKeys: string[];
    lastActivity: number;
    language: 'en' | 'ru';
}

export const UserSchema = new mongoose.Schema(
    {
        _id: String,
        created: Number,
        username: String,
        name: String,
        email: String,
        observableParishKeys: [
            String
        ],
        lastActivity: Number,
        language: String
    },
    { _id: false }
);

// UserSchema.pre('find', function() {
//     this.populate('observableParishes');
// }).pre('findOne', function() {
//     this.populate('observableParishes');
// });

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
