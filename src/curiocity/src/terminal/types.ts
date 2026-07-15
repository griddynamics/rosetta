/** Profile submit sequencing (§5.2 `submit`). Mirrors `config` `submitSchema`;
 *  duplicated as a bare union here so `terminal/` needs no `config/` import. */
export type SubmitMode = 'enter' | 'paste+enter' | 'type+enter';
