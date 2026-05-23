import type { Entity } from "../Entity";
import { AbstractMesh } from "@babylonjs/core";

/** Represents a loaded corridor segment. */
export class Corridor {
  entity: Entity;
  segmentIndex: number;
  meshes: AbstractMesh[];

  constructor(data: {
    entity: Entity;
    segmentIndex: number;
    meshes: AbstractMesh[];
  }) {
    this.entity = data.entity;
    this.segmentIndex = data.segmentIndex;
    this.meshes = data.meshes;
  }
}
