// Durum makinesi (Mat Buckland, "Programming Game AI by Example" - Simple Soccer):
// her oyuncu bir anda tek bir durumdadır; durumun enter / execute / exit kancaları vardır
class StateMachine{
  constructor(owner){this.owner=owner;this.current=null;this.previous=null;}
  change(next){
    if(next===this.current)return;
    if(this.current&&this.current.exit)this.current.exit(this.owner);
    this.previous=this.current;this.current=next;this.owner.stateT=0;
    if(next.enter)next.enter(this.owner);
  }
  // durumun execute'u bu kare için hedef noktayı ve hız çarpanını döndürür
  update(dt){this.owner.stateT+=dt;return this.current.execute(this.owner,dt);}
  is(state){return this.current===state;}
}
