import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
    _id: string;
    created: number;
    username: string;
    name: string;
    observableParishKeys: string[];
    lastActivity: number;
    language: 'en' | 'ru';
    totalParishes: number;
}

export const UserSchema = new mongoose.Schema(
    {
        _id: String,
        created: Number,
        username: String,
        name: String,
        observableParishKeys: [
            String
        ],
        lastActivity: Number,
        language: String,
        totalParishes: Number
    },
    { _id: false }
);

UserSchema.pre('find', function() {
    this.populate('observableParishes');
}).pre('findOne', function() {
    this.populate('observableParishes');
});

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
