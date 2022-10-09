import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppBootstrapManager } from '@src/app-bootstrap.manager';
import { UserFactory } from '@src/database/factories/user.factory';
import { AppDataSource } from '@src/config/datasource';
import { TicketProviderFactory } from '@src/database/factories/ticket-provider.factory';
import { TestHelper } from '@test/helpers/test.helper';
import { TicketFactory } from '@src/database/factories/ticket.factory';
import { SECRET_KEY_LENGTH } from '@src/ticket-provider-encryption-key/ticket-provider-encryption.types';
import { TicketProviderEncryptionKeyFactory } from '@src/database/factories/ticket-provider-encryption-key.factory';
import { KAFKA_PRODUCER_TOKEN } from '@src/producer/producer.types';

describe('Ticket-provider-encryption-keys (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let testHelper: TestHelper;
  let mockedClientKafka: jest.Mock;

  beforeAll(async () => {
    const testingModuleBuilder = AppBootstrapManager.getTestingModuleBuilder();
    mockedClientKafka = jest.fn().mockImplementation(() => ({
      connect: () => jest.fn().mockImplementation(() => Promise.resolve()),
      close: () => jest.fn().mockImplementation(() => Promise.resolve()),
      emit: () => jest.fn().mockImplementation(() => Promise.resolve()),
    }));

    testingModuleBuilder.overrideProvider(KAFKA_PRODUCER_TOKEN).useClass(mockedClientKafka);
    moduleFixture = await testingModuleBuilder.compile();

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
    request(app.getHttpServer()).get('/api/v1/ticket-provider-encryption-keys/1').expect(HttpStatus.UNAUTHORIZED);
    request(app.getHttpServer()).post('/api/v1/ticket-provider-encryption-keys').expect(HttpStatus.UNAUTHORIZED);
  });

  it(`should successfully create a new encryption key`, async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);

    await request(app.getHttpServer())
      .post('/api/v1/ticket-provider-encryption-keys')
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then(async (response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            version: 1,
            createdAt: expect.any(String),
            secretKey: expect.any(String),
          }),
        );
        expect(response.body.secretKey.length).toEqual(SECRET_KEY_LENGTH);
        expect(response.status).toBe(HttpStatus.CREATED);
      });
  });

  it(`should not get encryption key by version, because it belongs to another ticket provider`, async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);
    const ticketProviderSecond = await TicketProviderFactory.create();
    const encryptionKey = await TicketProviderEncryptionKeyFactory.create({
      ticketProviderId: ticketProviderSecond.id,
      version: 1,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/ticket-provider-encryption-keys/${encryptionKey.version}`)
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body.message).toEqual('Encryption key not found');
        expect(response.status).toBe(HttpStatus.NOT_FOUND);
      });
  });

  it(`should get encryption key by version successfully`, async () => {
    const ticketProvider = await TicketProviderFactory.create();
    const token = await testHelper.createTicketProviderToken(ticketProvider.id);
    const encryptionKey = await TicketProviderEncryptionKeyFactory.create({
      ticketProviderId: ticketProvider.id,
      version: 5,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/ticket-provider-encryption-keys/${encryptionKey.version}`)
      .set('Accept', 'application/json')
      .set('api-token', token)
      .then((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            version: encryptionKey.version,
            secretKey: encryptionKey.secretKey,
            createdAt: expect.any(String),
          }),
        );
        expect(response.status).toBe(HttpStatus.OK);
      });
  });
});
