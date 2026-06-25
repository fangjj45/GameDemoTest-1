import { _decorator, AudioSource,Animation,UIOpacity,Component, EventTouch, instantiate,Input, tween,input, js, Node , Prefab ,UITransform,Vec2,Vec3,Vec4, v3,v2 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ContentControlDictation')
export class ContentControlDictation extends Component {

    @property
    public boardWidth: number = 6;//棋盘宽
    @property
    public boardHeight: number = 6;//棋盘高

    isSwap = false;//动画期间禁止操作的锁

    chessBoard: Node[][] = [];//数组储存棋盘数据

    @property({ type: [Prefab] }) 
    chessPieces: Prefab[] = [];//棋子的模板

    
    swapBeforeIndex: number[] = null;
    swapAfterIndex: number[] = null;
    startTouchPos: Vec2 = null;


    @property 
    spacing = 96;//棋子的间距
    @property 
    x: number = -240;
    @property 
    y: number = 240;

    onLoad(): void {
        
    }

    start() {
        this.generateBoard();
        this.loadReMove();
        this.onMove();
        
    }

    update(deltaTime: number) {
        
    }

    async loadReMove(){
        const RePos:[number,number][]=[];
        for(let i=0;i<this.boardHeight;i++){
            for(let j=0;j<this.boardWidth;j++){
                RePos.push([i,j]);
            }
        }
        await this.reMove(RePos);
    }

    

    generateBoard(){
        this.chessBoard = Array.from({length:this.boardHeight},()=>
                          Array.from({length:this.boardWidth},()=> null));

        for(let i=0;i<this.boardHeight;i++){
            for(let j=0;j<this.boardWidth;j++){
                this.chessBoard[i][j]=this.generatePiece(i,j);
            }
        }
    }

    generatePiece(i: number,j: number){

        const piece=this.getRandomChessPiece();

        if (!piece) {
            console.error(`生成棋子失败 [${i},${j}]，请检查 chessPieces 数组是否为空或预制体无效`);
            return null;
        }
        
        const [x, y]=this.getPiecePosition(i, j);
        piece.setPosition(x,y);
        this.node.addChild(piece);
        return piece;
    }

    getPiecePosition(i:number,j:number): number[]{
        return [this.x+j*this.spacing,this.y-i*this.spacing]
    };
    
    // 触摸变量：按下位置、选中棋子的行列、
    getRandomChessPiece():Node {

        if (!this.chessPieces || this.chessPieces.length === 0) {
            console.error("chessPieces 数组为空！请在编辑器中拖入棋子预制体。");
            return null;
        }

        const randomIndex = Math.floor(Math.random() * this.chessPieces.length);
    // 使用随机数作为索引，从数组中选择一个棋子预制件
        const randomChessPiece = this.chessPieces[randomIndex];

        if (!randomChessPiece) {
            console.error(`chessPieces[${randomIndex}] 无效，请检查预制体资源是否丢失或未赋值。`);
            return null;
        }

        const piece = instantiate(randomChessPiece);
        return piece;
    }

    

    getPieceAtPosition(pos:Vec2|null):number[]{
        const uiTransform =this.node.getComponent(UITransform);//uiTransform组件参数
        if(!uiTransform)return;
        
        const { x, y } = uiTransform.convertToNodeSpaceAR(v3(pos.x, pos.y));

        for (let row = 0; row < this.chessBoard.length; row++) {
            for (let col = 0; col < this.chessBoard[row].length; col++) {
                const piece = this.chessBoard[row][col];
                const box = piece?.getComponent(UITransform).getBoundingBox();//记录了该棋子在其父节点（棋盘）坐标系中的位置和宽高
                if (box?.contains(v2(x, y))) {
                return [row, col];
                }
            }
        }
        return;
        
    }
    

    onMove(){
        
        input.on(Input.EventType.TOUCH_START,this.TouchStart,this);
        
        input.on(Input.EventType.TOUCH_MOVE,this.TouchMove,this);
    }
    

    TouchStart(event: EventTouch){//EventTouch来自官方库

        this.startTouchPos = event.getUILocation();
        //getUILocation()是官方库的
        this.swapBeforeIndex = this.getPieceAtPosition(this.startTouchPos);

    }


    TouchMove(event: EventTouch){
        
        if(this.isSwap||!this.swapBeforeIndex)return;
        const target=this.getSwappingPieces(event);//给滑动后棋子的数组坐标
        if(!target)return;
        const [row,col]=this.swapBeforeIndex;

        
            this.swapPiece([row,col],target,async (isSame:boolean)=>{
                if(isSame){
                    this.swapPiece([row,col],target);
                }else{
                  const isMatch=await this.reMove([[row,col],target]);
                  if (!isMatch) this.swapPiece([row, col], target);

                }
            this.swapAfterIndex=null;
            this.startTouchPos = null;
            });
        
    }


    swapPiece([row1, col1]: number[],[row2, col2]: number[],callback?: (isSame: boolean) => void) {

        if (!this.chessBoard[row1][col1] || !this.chessBoard[row2][col2]) return;

        this.isSwap = true;
        this.swapData(row1, col1, row2, col2);

        this.swapAnimation(
        this.chessBoard[row1][col1], this.chessBoard[row2][col2],() => {
            this.isSwap = false;
            if (
            this.chessBoard[row1][col1].name === this.chessBoard[row2][col2].name
            ) {
            callback?.(true);
            } else {
            callback?.(false);
            }
        }
        );
    }

    swapData(row1, col1, row2, col2){
        const temp = this.chessBoard[row1][col1];
        this.chessBoard[row1][col1] = this.chessBoard[row2][col2];
        this.chessBoard[row2][col2] = temp;
    }



    swapAnimation(a: Node, b: Node, callback?: () => void){
        if(!a||!b)return;
        const speed = 0.2;
        const aPos = new Vec3(a.position.x, a.position.y);
        const bPos = new Vec3(b.position.x, b.position.y);
    
        const swapAPromise = new Promise((resolve) => {
          tween(a)
            .to(speed, { position: bPos })
            .call(() => {
              resolve(true);
            })
            .start();
        });
    
        const swapBPromise = new Promise((resolve) => {
          tween(b)
            .to(speed, { position: aPos })
            .call(() => {
              resolve(true);
            })
            .start();
        });
        Promise.allSettled([swapAPromise, swapBPromise]).then(()=>{
            callback?.();
        });
    }
    
    getSwappingPieces(event: EventTouch):number[]|null{
        if(!this.startTouchPos||!event||!this.swapBeforeIndex||this.isSwap)return;
        let target=null;
        const[row,col]=this.swapBeforeIndex;
        const threshold=50;
        const{x:startX,y:startY}=this.startTouchPos;
        const{x:moveX,y:moveY}=event.getUILocation();
        const diffX=moveX-startX;
        const diffY=moveY-startY;

        if (Math.abs(diffX)>Math.abs(diffY)) {

            if(diffX>threshold){
                target=[row,col+1]
            }
            else if(diffX<-threshold){
                target=[row,col-1]
            }
        } else {
            if(diffY>threshold){
                target=[row-1,col]
            }
            else if(diffY<-threshold){
                target=[row+1,col]
            }

        }

        if(!this.isWithinBounds(target,this.boardWidth,this.boardHeight)){
            return null;
        }
        return target;
        
    }
    
    async reMove(pos):Promise<boolean>{
        
        let matches = [];
        for (let [row, col] of pos) {
        // 横向匹配
            let cols = this.checkMatch(row, col, true);
        // 纵向匹配
            let rows = this.checkMatch(row, col, false);
            matches = matches.concat(cols, rows);
        }
        matches = matches.filter((p, i, arr) => 
            arr.findIndex(m => m[0]===p[0] && m[1]===p[1]) === i
            );

        if (matches.length < 1) return false;

        const fadePromises=[];
        // 消除
        for (let [row, col] of matches) {
            const chessNode:Node |null= this.chessBoard[row][col];
            if (!chessNode) continue;

            if ((chessNode as any).isFading) continue;
            (chessNode as any).isFading = true;

            let opacityComp = chessNode.getComponent(UIOpacity);
            if (!opacityComp) opacityComp = chessNode.addComponent(UIOpacity);
            this.isSwap = true;  
            const promise = new Promise<void>((resolve) => {
                tween(opacityComp)
                    .to(0.1, { opacity: 0 }) 
                    .call(() => {
                        if (chessNode.isValid) {
                            chessNode.parent?.removeChild(chessNode);
                        }
                        resolve();
                    })
                .start();
            });
            fadePromises.push(promise);
            console.log("完成移除")
            
        }
        await Promise.all(fadePromises);

        for(let[row,col]of matches){
            this.chessBoard[row][col] = null;
        }

        console.log("抵达下落")
        
        const movedPos = [...await this.downMovePieces(), ...await this.reFillAndCheck()];
        
        if (movedPos.length > 0) {
                await this.reMove(movedPos);
        }
        
        this.isSwap = false;
        if(this.DeadPiece()){
            console.log("死局死局死局死局死局死局死局死局死局死局死局死局死局死局");
            setTimeout(() => {
                this.reset();
            }, 1000);
            
        }
        
        return true;
    }

    async reFillAndCheck(): Promise<[number, number][]>{
        const movedPos: [number, number][] =[];
        const animPromises: Promise<void>[] = []; 
        for (let row = 0; row < this.chessBoard.length; row++) {
            for (let col = 0; col < this.chessBoard[row].length; col++) {
                if (this.chessBoard[row][col] === null) {
                    const newPiece = this.generatePiece(-(row + 1), col);
                    this.chessBoard[row][col] = newPiece;
                    movedPos.push([row, col]);
                    animPromises.push(
                        this.downAnimation(newPiece,this.getPiecePosition(row, col))
                    );
                }
            }
        }
        await Promise.all(animPromises);
        return movedPos;
    }

    async downMovePieces(): Promise<[number, number][]>{
        const movedPos: [number, number][] =[];
        for(let col=this.chessBoard[0].length-1;col>=0;col--){
            let nullCount=0;
            for(let row=this.chessBoard.length-1;row>=0;row--){
                const piece=this.chessBoard[row][col];
                if(piece===null){
                    nullCount++;
                }else if(nullCount>0){
                    this.downAnimation(this.chessBoard[row][col],this.getPiecePosition(row + nullCount, col));
                    this.chessBoard[row + nullCount][col] = this.chessBoard[row][col];
                    this.chessBoard[row][col] = null;
                    movedPos.push([row + nullCount, col]);
                }
            }
        }
        return movedPos;
    }

    downAnimation(node: Node, [x, y]: number[]): Promise<void> {
    // 锁住不然动画过程中操作会出现异常
        return new Promise((resolve) => {
            tween(node)
            .to(0.5, { position: new Vec3(x, y) })
            .call(() => {
                resolve();
                
            })
            .start();
        });
    }

    

    checkMatch(row,col,crisscross){
        
        const matches=[[row,col]];
        const currentPiece = this.chessBoard[row][col];
        if (!currentPiece) return [];
        const current=currentPiece.name;
        
        let i=1;
        if(crisscross){
            while (col-i>=0&&this.chessBoard[row][col-i].name===current) {
                matches.push([row,col-i]);
                i++;
            }
            i=1;
            while (col+i<this.chessBoard[row].length&&this.chessBoard[row][col+i].name===current) {
                matches.push([row,col+i]);
                i++;
            }
        }else{
            while (row-i>=0&&this.chessBoard[row-i][col].name===current) {
                matches.push([row-i,col]);
                i++;
            }
            i=1;
            while (row+i<this.chessBoard.length&&this.chessBoard[row+i][col].name===current) {
                matches.push([row+i,col]);
                i++;
            }
        }
        return matches.length>=3?matches:[];

    }


    isWithinBounds(target,boardWidth,boardHeight){

        return (
            target &&
            target[0] >= 0 &&
            target[0] < boardHeight &&
            target[1] >= 0 &&
            target[1] < boardWidth
        );

    }

    reset(){
        console.log("重开重开重开重开重开重开重开重开重开");
        this.startTouchPos = null;
        this.swapBeforeIndex = null;
        this.swapAfterIndex = null;
        this.isSwap = false;
        this.chessBoard = [];
        this.node.removeAllChildren();
        this.start();


    }
    DeadPiece():boolean{
        for(let row=0;row<this.boardHeight;row++){
            for(let col=0;col<this.boardWidth;col++){
            if(col+1<this.boardWidth){
                this.swapData(row,col,row,col+1);
                if(this.checkMatch(row,col,true).length>=3||
                   this.checkMatch(row,col,false).length>=3||
                    this.checkMatch(row,col+1,true).length>=3||
                   this.checkMatch(row,col+1,false).length>=3){
                    this.swapData(row,col,row,col+1);
                    return false;
                    }
                    this.swapData(row,col,row,col+1);
                }

                if(row+1<this.boardHeight){
                this.swapData(row,col,row+1,col);
                if(this.checkMatch(row,col,true).length>=3||
                   this.checkMatch(row,col,false).length>=3||
                    this.checkMatch(row+1,col,true).length>=3||
                   this.checkMatch(row+1,col,false).length>=3){
                    this.swapData(row,col,row+1,col);
                    return false;
                    }
                    this.swapData(row,col,row+1,col);
                }
            }
            
        }


        return true;
    }

}


