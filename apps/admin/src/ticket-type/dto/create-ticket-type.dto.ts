import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, MinLength, Validate } from 'class-validator';
import { EventExistsValidator } from '../validators/event-exists.validator';
import { TicketTypeDuplicateValidator } from '../validators/ticket-type-duplicate.validator';
import { TicketTypeDto } from './ticket-type.dto';
import { TicketProviderExistsValidator } from '@admin/ticket-provider/validators/ticket-provider-exists.validator';
import { Type } from 'class-transformer';

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

  @ApiProperty({
    example: 'Awesome experience',
    required: false,
    minimum: 1,
    maximum: 1000,
    description: 'Description of the ticket type',
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(1000)
  description: string;

  @ApiProperty({
    example: 1,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Validate(TicketProviderExistsValidator)
  ticketProviderId: number;
}
