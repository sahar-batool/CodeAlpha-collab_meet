import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploaderName: { type: String, required: true },
    originalName: { type: String, required: true, maxlength: 200 },
    storedName: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true }
);

fileSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    name: this.originalName,
    size: this.size,
    fromName: this.uploaderName,
    at: this.createdAt.getTime(),
  };
};

export const File = mongoose.model('File', fileSchema);