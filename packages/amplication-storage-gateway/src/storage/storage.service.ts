import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { sync } from "glob";
import { BASE_BUILDS_FOLDER } from "src/constants";
import { FileMeta } from "./dto/FileMeta";
import { NodeTypeEnum } from "./dto/NodeTypeEnum";
import assert from "assert";
import { readFileSync } from "fs";
import { join } from "path";

type FilesDictionary = { [name: string]: FileMeta };

@Injectable()
export class StorageService {
  private buildsFolder: string | undefined;
  constructor(configService: ConfigService) {
    this.buildsFolder = configService.get<string>(BASE_BUILDS_FOLDER);
    assert(this.buildsFolder);
  }

  private buildFolder(appId: string, buildId: string) {
    return `${this.buildsFolder}/builds/${appId}/${buildId}`;
  }

  getBuildFilesList(appId: string, buildId: string, relativePath: string = "") {
    const results: FilesDictionary = {};

    const cwd = `${this.buildFolder(appId, buildId)}/${relativePath || ""}`;
    const files = sync(`*`, {
      nodir: true,
      dot: true,
      cwd,
    });
    files.forEach((file) => {
      const path = join(relativePath, file);
      results[file] = {
        name: file,
        type: NodeTypeEnum.File,
        path: path,
      };
    });
    const foldersWithFiles = sync(`*`, { nodir: false, cwd });
    foldersWithFiles.forEach((file) => {
      if (!results[file]) {
        results[file] = {
          name: file,
          type: NodeTypeEnum.Folder,
          path: join(relativePath, file),
        };
      }
    });

    return StorageService.sortFoldersAndFiles(results);
  }

  private static sortFoldersAndFiles(files: FilesDictionary) {
    return Object.values(files).sort((a, b) => {
      // return the array with all the folders on top like vscode
      if (a.type === NodeTypeEnum.Folder && b.type !== NodeTypeEnum.Folder) {
        return -1;
      }
      // and then alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  fileContent(appId: string, buildId: string, path: string = ""): string {
    const filePath = `${this.buildFolder(appId, buildId)}/${path}`;
    return readFileSync(filePath).toString();
  }
}