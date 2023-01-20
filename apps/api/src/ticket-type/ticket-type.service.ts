/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { EventService } from '@api/event/event.service';
import { OutboxService } from '@api/outbox/outbox.service';
import { Not, QueryRunner } from 'typeorm';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { FindTicketTypesDto } from './dto/find-ticket-types.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { TicketTypeCreateMessage } from './messages/ticket-type-create.message';
import { TicketTypeUpdateMessage } from './messages/ticket-type-update.message';
import { TicketType } from './ticket-type.entity';
import { TicketTypeRepository } from './ticket-type.repository';
import { TicketTypeEventPattern } from './ticket-type.types';
import { PaginatedResult } from '@app/common';

@Injectable()
export class TicketTypeService {
  constructor(
    private readonly ticketTypeRepository: TicketTypeRepository,
    private readonly eventService: EventService,
    private readonly outboxService: OutboxService,
  ) {}

  async findByUuid(uuid: string): Promise<TicketType> {
    return this.ticketTypeRepository.findOneBy({ uuid });
  }

  async findByUuidAndTicketProvider(uuid: string, ticketProviderId: number): Promise<TicketType> {
    return this.ticketTypeRepository.findOne({
      where: { uuid, event: { ticketProviderId } },
      relations: ['event'],
    });
  }

  async findByNameAndEvent(
    name: string,
    eventId: number,
    ticketDateStart: any,
    ticketDateEnd: any,
    excludeUuid?: string,
  ): Promise<TicketType> {
    const findParams = { name, eventId, ticketDateStart, ticketDateEnd: ticketDateEnd ?? null };

    if (excludeUuid) {
      findParams['uuid'] = Not(excludeUuid);
    }

    return this.ticketTypeRepository.findOneBy(findParams);
  }

  async findAllPaginated(searchParams: FindTicketTypesDto): Promise<PaginatedResult<TicketType>> {
    const event = await this.eventService.findByUuid(searchParams.eventUuid);

    return this.ticketTypeRepository.getPaginatedQueryBuilder(searchParams, event.id);
  }

  async create(body: CreateTicketTypeDto): Promise<TicketType> {
    const { ticketProvider, ...ticketTypeParams } = body;
    const event = await this.eventService.findByUuid(body.eventUuid);
    const queryRunner = this.ticketTypeRepository.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const createdTicketType = await queryRunner.manager.save(
        this.ticketTypeRepository.create({ ...ticketTypeParams, eventId: event.id }),
      );
      const ticketType = await queryRunner.manager.findOneBy(TicketType, { id: createdTicketType.id });

      const payload = new TicketTypeCreateMessage({ ticketType });
      await this.outboxService.create(queryRunner, TicketTypeEventPattern.Create, payload);

      await queryRunner.commitTransaction();

      return this.findByUuid(ticketType.uuid);
    } catch (err) {
      await queryRunner.rollbackTransaction();

      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async update(body: UpdateTicketTypeDto): Promise<TicketType> {
    const { ticketProvider, uuid, ...ticketTypeParams } = body;

    const queryRunner = this.ticketTypeRepository.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      await queryRunner.manager
        .createQueryBuilder(TicketType, 'ticket_type')
        .update(TicketType)
        .where({ uuid })
        .set({ ...ticketTypeParams })
        .execute();

      const updatedTicketType = await queryRunner.manager.findOneBy(TicketType, { uuid });
      const payload = new TicketTypeUpdateMessage({ ticketType: updatedTicketType });

      await this.outboxService.create(queryRunner, TicketTypeEventPattern.Update, payload);
      await queryRunner.commitTransaction();

      return this.findByUuid(uuid);
    } catch (err) {
      await queryRunner.rollbackTransaction();

      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findOrCreate(
    queryRunner: QueryRunner,
    eventId: number,
    name: string,
    ticketDateStart: any,
    ticketDateEnd?: any,
  ): Promise<TicketType> {
    return this.ticketTypeRepository.findOrCreate(queryRunner, eventId, name, ticketDateStart, ticketDateEnd);
  }
}
