import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SessionAuthGuard } from '../auth/auth.guard';
import { requireRole } from '../auth/require-role';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(SessionAuthGuard)
  @Get('me')
  getCurrentUser(@Request() request: { user: { id: string } }) {
    return this.userService.findById(request.user.id);
  }

  @UseGuards(SessionAuthGuard)
  @Patch('me')
  updateCurrentUser(
    @Request() request: { user: { id: string } },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(request.user.id, updateUserDto);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @requireRole('ADMIN')
  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @requireRole('ADMIN')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @requireRole('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @requireRole('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
