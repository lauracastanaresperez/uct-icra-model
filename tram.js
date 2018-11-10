/*
  Equacions d'un tram de riu: veure "docs/riu/equacions\ riu.docx"
  Estructura Taula resum de trams de riu
    [tram influent 1, codi tram influent 2, codi edar influent]+
    [wb, wt, Dt, angle, n, S, Li, UTM_X, UTM_Y]
*/

class Tram {
  constructor(wb,wt,Db,S,n,Li,Di){
    //inputs i default values
    this.wb = isNaN(wb) ? 3      : wb; //amplada a llera mitjana (m)
    this.wt = isNaN(wt) ? 6      : wt; //amplada a bankful mitjana (m)
    this.Db = isNaN(Db) ? 2      : Db; //distància entre llera i bankfull mitjana (m)
    this.S  = isNaN(S ) ? 0.005  : S ; //pendent de la llera: obtingut amb resolució mínima de 30m de pixel, i estimant la pendent per un tram d'1 km
    this.n  = isNaN(n ) ? 0.0358 : n ; //coeficient de manning (n) s'obté de regressió entre Qi i HRi també es pot usar el mètode de Verzano et al per determinar n, o usar el valor 0.0358, que és la mitjana europea.
    this.Li = isNaN(Li) ? 1000   : Li; //longitud tram (m)
    this.Di = isNaN(Di) ? 1.2    : Di; //fondària concreta (m)

    //trams connectats upstream (pares). Definits per l'usuari.
    this.pares=[]; /*array <Tram>*/

    //State Variables(Q, S_VFA, S_FBSO, X_BPO, X_UPO, S_USO, X_iSS, S_FSA, S_OP, S_NOx){
    this.state_variables = new State_Variables(0,0,0,0,0,0,0,0,0,0);

    //EDAR que aboca al tram (per defecte no n'hi ha)
    this.wwtp = null; //<State_Variables>

    //ALTRES (pel frontend, discutir amb Anna) TBD
    //id per la base de dades
    this.id="1";
    //coordenades per dibuixar els trams
    this.coordenades={inici:[0,0], final:[0,0]};
  }

  /*Resultats*/
    //calcula angle "alfa" entre la llera i el màxim del canal (bankfull) (radiants)
    get angle(){return Math.asin((this.wt-this.wb)/(2*this.Db));}
    //calcula fondària màxima (m)
    get Dt(){return this.Db*Math.cos(this.angle);}
    //en funció de la fondària (Di), tenim wi, Ai, wpi, HRi i Qi
    get wi() {return this.wb + 2*this.Di*Math.tan(this.angle); }      //m  | amplada de la llera inundada
    get Ai() {return this.Di*(this.wb+this.Di*Math.tan(this.angle));} //m2 | area transversal inundada
    get wpi(){return this.wb + 2*this.Di/Math.cos(this.angle); }      //m  | perímetre humit inundat
    get HRi(){return this.Ai/this.wpi;                         }      //m  | radi hidràulic
    //Amb n determinat podem estimar wi, Ai, wpi, HRi i Qi en funció de Di. 
    get Qi()  {return (1/this.n)*Math.pow(this.HRi,2/3)*Math.sqrt(this.S);} //m3/s | cabal
    get HRTi(){return this.Li*this.Ai/this.Qi/60;                         } //min  | el temps mig de residència de l'aigua HRTi
    get Si()  {return this.Li*this.wpi;                                   } //m2   | la superfície inundada en el tram d'interès
    /*Per a fer un seguiment, s’hauria de mirar estat químic i ecològic al 
      final del tram fluvial, així com al final de tram de barreja lateral, punt a 
      partir del qual la química de l’aigua és resultat de la barreja de la 
      química dels trams fluvials i EDAR influents. La longitud del tram de barreja 
      lateral (Ll) es determina a partir de paràmetres hidràulics, amplada (wi), 
      coeficient de dispersió lateral (ky) i velocitat mitjana (u). El coeficient de 
      dispersió lateral es calcula a partir de la fondària (Di), la força de la 
      gravetat (g), i la pendent de la llera fluvial (S): */
    get ky(){return 0.6*this.Di*Math.sqrt(9.81*this.S*this.Di)};      //coeficient de dispersió lateral (ky)
    get Ll(){return Math.pow(this.wi,2)*this.Qi/this.Ai/(2*this.ky);} //longitud del tram de barreja lateral (Ll)

  //empaqueta els resultats
  get resultats(){return{
    angle:{value:this.angle, unit:"rad",  descr:"Angle &alpha; entre la llera i el màxim del canal (bankful)"},
    Dt   :{value:this.Dt,    unit:"m",    descr:"Fondària màxima"},
    wi   :{value:this.wi,    unit:"m",    descr:"Amplada de la llera inundada"},
    Ai   :{value:this.Ai,    unit:"m2",   descr:"Àrea transversal inundada"},
    wpi  :{value:this.wpi,   unit:"m",    descr:"Perímetre humit inundat"},
    HRi  :{value:this.HRi,   unit:"m",    descr:"Radi hidràulic"},
    Qi   :{value:this.Qi,    unit:"m3/s", descr:"Cabal"},
    HRTi :{value:this.HRTi,  unit:"min",  descr:"Temps mig de residència de l'aigua"},
    Si   :{value:this.Si,    unit:"m2",   descr:"Superfície inundada"},
    ky   :{value:this.ky,    unit:"?",    descr:"Coeficient de dispersió lateral"},
    Ll   :{value:this.Ll,    unit:"m",    descr:"Longitud del tram de barreja lateral"},
  }};

  //massa o càrrega al final del tram fluvial degut a la degradació
  //en un futur es reemplaçarà per un model més complet
  Mf(Mi,R_20,k,T){
    //Mi  : massa a l'inici del tram fluvial: suma dels diferents trams que alimenten el tram (kg)
    //R_20: velocitat de reacció a 20ºC (g/m2·min)
    //k   : (input, es com una ks) (g/m3)
    //T   : temperatura (ºC)
    if(Mi==0) return 0;
    let Mf=Mi - R_20*this.HRTi*this.Si*Math.pow(1.041,T-20)*(Mi/this.Qi)/(k+Mi/this.Qi);
    return Math.max(Mf,0);
  };
}

//node imports and exports
if(typeof document == "undefined"){
  State_Variables=require("./state-variables.js");
  module.exports=Tram;
}

//test valors Vicenç Acuña (vacuna@icra.cat)
(function test(){
  return;
  //sintaxi:  Tram(wb, wt, Db, S,     n,      Li,   Di)
  let t = new Tram(3,  6,  2,  0.005, 0.0358, 1000, 1.2);
  console.log(t.resultats);
  return;
  //recorre variables d'estat (fluxes màssics) i calcula massa final
  t.state_variables.Q = 25;
  t.state_variables.set('S_VFA',10);
  Object.entries(t.state_variables.fluxes.components).forEach(([key,Mi])=>{
    let Mf=t.Mf(Mi, 0, 0, 0); //g/s
    console.log(`Mf[${key}] (Mi=${Mi}): ${Mf} (g/s)`);
  });
})();
