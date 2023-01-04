import through2 = require("through2");
export = connect
type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>
type TParser = (input: string) => JSONValue
type TOptions = {
    uri?: string
    parse?: TParser
}
declare function connect(
  appKey: string,
  accessToken: string,
  _opts?: TOptions
): through2.Through2Constructor