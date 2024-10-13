import { Module } from "@nestjs/common";
import { SettingService } from "./settings.service";
import { SettingController } from "./settings.controller";
import { PrismaModule } from "src/modules/prisma/prisma.module";

@Module({
    controllers: [SettingController],
    providers: [SettingService],
    imports: [PrismaModule],
    exports: [SettingService]
})

export class SettingsModule {}