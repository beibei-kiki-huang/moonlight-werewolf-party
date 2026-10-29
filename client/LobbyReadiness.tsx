import type {GameView} from '../shared/types';
import type {Translate} from './presentation';
export function lobbyBlockers(view:GameView,connected:boolean,pending:boolean,tr:Translate){
 const reasons:string[]=[];
 if(!connected)reasons.push(tr('Your connection is interrupted. Wait to reconnect.','你的连接已中断，请等待重连。'));
 if(pending)reasons.push(tr('Saving your latest change…','正在保存最新操作…'));
 if(view.youId!==view.hostId)reasons.push(tr('Only the host can start this game.','只有房主可以开始游戏。'));
 const min=view.mode==='classic'?5:2,max=view.mode==='classic'?8:2;
 if(view.players.length<min||view.players.length>max)reasons.push(view.mode==='classic'?tr(`Classic needs 5–8 seats; ${view.players.length} joined.`,`经典模式需5–8个座位，目前${view.players.length}人。`):tr('Duel needs exactly two players.','对决模式需要恰好两人。'));
 const offline=view.players.filter(p=>!p.connected).map(p=>p.name),unready=view.players.filter(p=>p.connected&&!p.ready).map(p=>p.name);
 if(offline.length)reasons.push(tr(`Reconnect or remove offline seats: ${offline.join(', ')}.`,`请重连或移出离线座位：${offline.join('、')}。`));
 if(unready.length)reasons.push(tr(`Still needs Ready: ${unready.join(', ')}.`,`尚未点击准备：${unready.join('、')}。`));
 return reasons;
}
export function LobbyReadiness({view,connected,pending,tr}:{view:GameView;connected:boolean;pending:boolean;tr:Translate}){
 const reasons=lobbyBlockers(view,connected,pending,tr);
 return <div className="lobby-readiness" role="status"><strong>{reasons.length?tr('Before we begin','开局前请完成'):tr('Everyone is ready. The host can begin.','所有人已准备，房主可以开局。')}</strong>{reasons.length>0&&<ul>{reasons.map(r=><li key={r}>{r}</li>)}</ul>}<p>{tr('Each tab has its own seat. Returning players can explicitly resume a saved seat.','每个标签页独立保存座位。返回的玩家可主动选择恢复原座位。')}</p></div>
}
