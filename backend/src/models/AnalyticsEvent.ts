import { Schema, model } from 'mongoose'

export type AnalyticsType = 'impression' | 'click' | 'call' | 'navigate' | 'save' | 'report'

export interface IAnalyticsEvent {
  type: AnalyticsType
  listingId?: import('mongoose').Types.ObjectId
  userId?: import('mongoose').Types.ObjectId
  meta?: Record<string, unknown>
  createdAt: Date
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    type: { type: String, enum: ['impression', 'click', 'call', 'navigate', 'save', 'report'], required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Business', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

export const AnalyticsEvent = model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema)

