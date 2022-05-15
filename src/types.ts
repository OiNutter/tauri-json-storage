export interface StorageOptions {
  dataPath?: string
}

export interface WriteOptions extends StorageOptions {
  validate?: boolean,
  prettyPrinting?: boolean
}