import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppBootstrapManager } from '@src/app-bootstrap.manager';
import { UserFactory } from '@src/database/factories/user.factory';
import { AppDataSource } from '@src/config/datasource';
import { TicketProviderFactory } from '@src/database/factories/ticket-provider.factory';
import { TestHelper } from '@test/helpers/test.helper';
import { UserStatus } from '@src/user/user.types';
import { faker } from '@faker-js/faker';
import { User } from '@src/user/user.entity';

describe('User (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let testHelper: TestHelper;

  beforeAll(async () => {
    moduleFixture = await AppBootstrapManager.getTestingModule();
    app = moduleFixture.createNestApplication();
    AppBootstrapManager.setAppDefaults(app);
    testHelper = new TestHelper(moduleFixture, jest);
    await AppDataSource.initialize();
    await app.init();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await testHelper.cleanDatabase();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('checks that endpoints are protected', () => {
    request(app.getHttpServer()).get('/api/v1/users/1').expect(HttpStatus.UNAUTHORIZED);
    request(app.getHttpServer()).post('/api/v1/users').expect(HttpStatus.UNAUTHORIZED);
    request(app.getHttpServer()).patch('/api/v1/users').expect(HttpStatus.UNAUTHORIZED);
  });

  it('should post a user and get validation errors', async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body.message).toEqual(
          expect.arrayContaining([
            'name must be shorter than or equal to 128 characters',
            'email must be shorter than or equal to 255 characters',
            'phoneNumber must be a valid phone number',
          ]),
        );
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
  });

  it(`should successfully create a new user`, async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);

    const userData = {
      name: faker.name.firstName(),
      email: faker.internet.email(),
      phoneNumber: faker.phone.number('+38050#######').toString(),
    };

    await request(app.getHttpServer())
      .post('/api/v1/users')
      .send(userData)
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then(async (response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            ...userData,
            uuid: expect.any(String),
            status: UserStatus.Creating,
          }),
        );
        expect(response.status).toBe(HttpStatus.CREATED);

        const newUser = await AppDataSource.manager
          .getRepository(User)
          .findOne({ where: { uuid: response.body.uuid } });

        expect(newUser.ticketProviderId).toEqual(ticketProvider.id);
      });
  });

  it('should patch a user and get validation errors', async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);
    const user = await UserFactory.create({ ticketProviderId: ticketProvider.id });

    const patchedUser = {
      name: 1,
      email: 'not an email',
      phoneNumber: '+1',
    };

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.uuid}`)
      .send(patchedUser)
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body.message).toEqual(
          expect.arrayContaining([
            'name must be shorter than or equal to 128 characters',
            'email must be an email',
            'phoneNumber must be a valid phone number',
          ]),
        );
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
  });

  it('should patch a user and get validation error if no data is passed', async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);
    const user = await UserFactory.create({ ticketProviderId: ticketProvider.id });

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.uuid}`)
      .send({})
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body.message).toEqual(
          expect.arrayContaining([
            'name must be shorter than or equal to 128 characters',
            'email must be shorter than or equal to 255 characters',
            'phoneNumber must be a valid phone number',
          ]),
        );
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      });
  });

  it('should patch a user successfully with all fields passed', async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);
    const user = await UserFactory.create({ ticketProviderId: ticketProvider.id });

    const patchedUser = {
      name: 'New name',
      email: 'new@email.com',
      phoneNumber: faker.phone.number('+38050#######').toString(),
    };

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.uuid}`)
      .send(patchedUser)
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            uuid: user.uuid,
            status: user.status,
            updatedAt: expect.any(String),
            ...patchedUser,
          }),
        );
        expect(response.status).toBe(HttpStatus.OK);
      });
  });

  it('should patch a user successfully with one field passed', async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);
    const user = await UserFactory.create({ ticketProviderId: ticketProvider.id });

    const patchedUser = {
      name: 'New name',
    };

    await request(app.getHttpServer())
      .patch(`/api/v1/users/${user.uuid}`)
      .send(patchedUser)
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            uuid: user.uuid,
            status: user.status,
            updatedAt: expect.any(String),
            ...patchedUser,
          }),
        );
        expect(response.status).toBe(HttpStatus.OK);
      });
  });

  it(`should not get user by uuid, because it belongs to another ticket provider`, async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);
    const ticketProviderSecond = await TicketProviderFactory.create();
    const user = await UserFactory.create({ ticketProviderId: ticketProviderSecond.id });

    await request(app.getHttpServer())
      .get(`/api/v1/users/${user.uuid}`)
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body.message).toEqual('User not found');
        expect(response.status).toBe(HttpStatus.NOT_FOUND);
      });
  });

  it(`should get user by uuid successfully`, async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);
    const user = await UserFactory.create({ ticketProviderId: ticketProvider.id });

    await request(app.getHttpServer())
      .get(`/api/v1/users/${user.uuid}`)
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            uuid: user.uuid,
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
            status: user.status,
            walletAddress: user.walletAddress,
          }),
        );
        expect(response.status).toBe(HttpStatus.OK);
      });
  });
});
