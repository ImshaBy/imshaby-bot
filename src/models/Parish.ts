import mongoose, { Document } from 'mongoose';

export interface IParish extends Document {
  _id: string;
  title: string;
  broadcastUrl: string;
  address: string;
  needUpdate: boolean;
  lastMassActualDate: string;
  lastModifiedDate: string;
  phone: string;
  email: string;
  website: string;
  updatePeriodInDays: number;
  imgPath: string;
}

export const ParishSchema = new mongoose.Schema(
  {
    _id: String,
    title: String,
    updatePeriodInDays: Number
  },
  { _id: false }
);

const Parish = mongoose.model<IParish>('Parish', ParishSchema);
export default Parish;
