-- CreateTable
CREATE TABLE "asset_entries" (
    "id" SERIAL NOT NULL,
    "snapshot_id" INTEGER,
    "rid" INTEGER,
    "class_name" TEXT,
    "size" BIGINT,
    "streamed_size" BIGINT,
    "name" TEXT,
    "guid" TEXT,
    "internal_guid" TEXT,
    "hash" TEXT,

    CONSTRAINT "asset_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_links" (
    "id" SERIAL NOT NULL,
    "snapshot_id" INTEGER,
    "from_id" INTEGER,
    "to_id" INTEGER,
    "link_type" TEXT,

    CONSTRAINT "asset_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_snapshots" (
    "id" SERIAL NOT NULL,
    "player_version" TEXT,
    "platform" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "build_time" TIMESTAMP(6),
    "tag" TEXT,
    "comment" TEXT,
    "version" TEXT,
    "delete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "asset_snapshots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "asset_entries" ADD CONSTRAINT "asset_entries_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "asset_snapshots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asset_links" ADD CONSTRAINT "asset_links_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "asset_snapshots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
