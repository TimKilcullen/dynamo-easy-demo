import {
  CustomMapper,
  DateProperty,
  GSIPartitionKey,
  GSISortKey,
  Model,
  PartitionKey,
  SortKey,
  Transient,
} from '@shiftcoders/dynamo-easy'
import * as moment from 'moment-timezone'
import { DynamoIndexes } from '../static/dynamo-indexes'
import { clientProjectMapper } from './client-project.mapper'
import { ClientProject } from './client-project.model'
import { Employee } from './employee.model'
import { monthEmailMapper } from './month-email.mapper'
import { MonthEmail } from './month-email.model'
import { Project } from './project.model'
import { timeEntryIdMapper } from './time-entry-id.mapper'
import { TimeEntryId } from './time-entry-id.model'

// unique by monthEmail + startDate or clientProject + unixTsUserId
// means an employee can only have one time entry at a starting time
@Model({ tableName: 'timeEntries' })
export class TimeEntry {
  // if you want properties, which should not be stored in the table
  // you have to decorate them with @Transient()
  // --> blacklist
  @Transient()
  get uniqueIdentifier(): string {
    return `${this.monthEmail}${this.startDate.toISOString()}`
  }

  // if you want a complex type as PartitionKey or SortKey
  // you need to define a custom mapper since dynamoDb only accepts string, number or binary for such
  @CustomMapper(monthEmailMapper)
  @PartitionKey()
  monthEmail: MonthEmail

  @SortKey()
  @DateProperty()
  startDate: moment.Moment

  @CustomMapper(clientProjectMapper)
  @GSIPartitionKey(DynamoIndexes.TIME_ENTRIES_CLIENTPROJECT_UNIXTSUSERID)
  clientProject: ClientProject

  // this sort key is composed of the unix timestamp and the user id.
  // it's used to read all time entries in a specific time from a project
  @CustomMapper(timeEntryIdMapper)
  @GSISortKey(DynamoIndexes.TIME_ENTRIES_CLIENTPROJECT_UNIXTSUSERID)
  unixTsUserId: TimeEntryId

  duration: number // seconds

  static fromObjects(
    { clientSlug, slug }: Project,
    { id, email }: Employee,
    startDate: moment.Moment,
    duration: number
  ) {
    return new TimeEntry(clientSlug, slug, startDate, duration, id, email)
  }

  constructor(
    clientSlug: string,
    projectSlug: string,
    startDate: moment.Moment,
    duration: number,
    userId: number,
    userEmail: string
  ) {
    this.monthEmail = new MonthEmail(startDate, userEmail)
    this.startDate = startDate
    this.clientProject = new ClientProject(clientSlug, projectSlug)
    this.unixTsUserId = new TimeEntryId(startDate, userId)
    this.duration = duration
  }
}
