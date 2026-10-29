import type {Seat} from '../shared/types';
const key='moonlight.seat';
export interface SeatStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
function read(storage:SeatStorage):Seat|null{try{const s=JSON.parse(storage.getItem(key)||'null');return s&&typeof s.code==='string'&&typeof s.playerId==='string'&&typeof s.token==='string'?s:null}catch{return null}}
export function tabSeat():Seat|null{try{return read(sessionStorage)}catch{return null}}
export function savedSeat():Seat|null{try{return read(localStorage)}catch{return null}}
export function storeSeat(seat:Seat,tab:SeatStorage=sessionStorage,saved:SeatStorage=localStorage){const value=JSON.stringify(seat);tab.setItem(key,value);saved.setItem(key,value)}
export function clearSeat(seat:Seat|null){for(const get of [()=>sessionStorage,()=>localStorage])try{const storage=get();if(!seat||read(storage)?.playerId===seat.playerId)storage.removeItem(key)}catch{}}
export function readSeatFrom(storage:SeatStorage){return read(storage)}
