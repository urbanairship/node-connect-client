import through2 = require("through2");
export = connect
type TParser<JSON> = {
  [Property in keyof JSON]: (variable: any) => JSON[Property]
}
type TOptions = {
  uri?: string
  parse?: () => TParser<JSON>
}

declare function connect(
  appKey: string,
  accessToken: string,
  _opts?: TOptions
): through2.Through2Constructor