import { v4 as uuid } from 'uuid';
import { Ticket } from '../ticket.entity';

export class TicketValidateMessage {
  operationUuid: string;
  ticket: Ticket;

  constructor(data: Partial<TicketValidateMessage>) {
    Object.assign(this, data);
    this.operationUuid = uuid();
  }

  toString() {
    return JSON.stringify(this);
  }
}
