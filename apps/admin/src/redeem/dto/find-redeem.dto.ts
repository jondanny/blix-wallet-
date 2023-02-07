import { CursorFilterDto } from '@app/common/pagination/cursor-filter.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsIn, IsInt, Min, Max, IsString } from 'class-validator';
import { Redeem } from '@app/redeem/redeem.entity';

export class FindRedeemDto extends CursorFilterDto {
  @ApiProperty({ example: 'createdAt', enum: ['createdAt'], required: false })
  @IsOptional()
  @IsIn(['createdAt'])
  orderParam: keyof Redeem = 'createdAt';

  @ApiProperty({ example: 10, minimum: 1, maximum: 50, required: false })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit = 50;

  @ApiProperty({ example: '+1***********', required: false })
  @IsOptional()
  @IsString()
  userPhoneNumber: string;
}
