import { Schema, model } from 'mongoose'

export interface IComment {
  content: string
  postId: import('mongoose').Types.ObjectId
  userId: import('mongoose').Types.ObjectId
  authorName: string
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<IComment>(
  {
    content: { type: String, required: true, maxlength: 500, trim: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true, trim: true },
  },
  { timestamps: true }
)

export const Comment = model<IComment>('Comment', commentSchema)


