import { Injectable } from "@nestjs/common";
import { PassportSerializer } from "@nestjs/passport";
import { UserService } from "../../user/user.service.js";

@Injectable()
export class SessionSerializer extends PassportSerializer {
    constructor(private userService: UserService) { 
      super();
    }
  
    serializeUser(user: any, done: (err: Error | null, id: any) => void): any {
      done(null, user.id);
    }
  
    async deserializeUser(payload: any, done: (err: Error | null, user: any) => void): Promise<any> {
      const user = await this.userService.findById(payload); 
      done(null, user);
    }
  }