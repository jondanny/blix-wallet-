import { ApiProperty } from '@nestjs/swagger';
import { TicketProvider } from '@src/ticket-provider/ticket-provider.entity';
import { Allow, IsString, IsUUID, MaxLength, MinLength, Validate } from 'class-validator';
import { EventExistsValidator } from '../validators/event-exists.validator';
import { TicketTypeDuplicateValidator } from '../validators/ticket-type-duplicate.validator';
import { TicketTypeDto } from './ticket-type.dto';

export class CreateTicketTypeDto extends TicketTypeDto {
  @ApiProperty({
    example: 'VIP ticket',
    required: true,
    description: 'Event uuid',
  })
  @IsUUID()
  @Validate(EventExistsValidator)
  eventUuid: string;

  @ApiProperty({
    example: 'VIP ticket',
    required: true,
    minimum: 1,
    maximum: 255,
    description: 'Name of the ticket type',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Validate(TicketTypeDuplicateValidator)
  name: string;

  @Allow()
  ticketProvider: TicketProvider;
}
