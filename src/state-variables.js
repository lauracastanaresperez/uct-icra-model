/*
  STATE VARIABLES CLASS
  Each removal technology is be a method inside state variables, implemented in
  its own file (e.g. nitrification.js) as
  "State_Variables.prototype.technology_name=function(){implementation}"
  technologies are:
    "primary-settler",
    "activated-sludge",
    "chemical-P-removal"
    "nitrification",
    "denitrification"

  A State_Variables oject represents an arrow in a WWTP model, for example:
    Qi → [PST] → [AS] → [nitrification] → Qe
          ↓       ↓      ↓
          Qw      Qw     Qw

  Summary of this file:
    1. data structure
      - Q value
      - components substructure
      - mass ratios substructure
    2. class methods
      - set
      - totals
      - fluxes
      - summary
      - combine
    3. tests
*/

class State_Variables {
  constructor(Q, S_VFA, S_FBSO, X_BPO, X_UPO, S_USO, X_iSS, S_FSA, S_OP, S_NOx, X_OHO, X_PAO){
    //numeric input checks
    if(Q      <  0) throw `Error: Flowrate (Q=${Q}) not allowed`;
    if(S_VFA  <  0) throw `Error: volatile fatty acids (S_VFA=${S_VFA}) not allowed`;
    if(S_FBSO <  0) throw `Error: fermentable biodegradable soluble organics (S_FBSO=${S_FBSO}) not allowed`;
    if(X_BPO  <  0) throw `Error: biodegradable particulated organics (X_BPO=${X_BPO}) not allowed`;
    if(X_UPO  <  0) throw `Error: unbiodegradable particulated organics (X_UPO=${X_UPO}) not allowed`;
    if(S_USO  <  0) throw `Error: unbiodegradable soluble organics (S_USO=${S_USO}) not allowed`;
    if(X_iSS  <  0) throw `Error: inert suspended solids (X_iSS=${X_iSS}) not allowed`;
    if(S_FSA  <  0) throw `Error: free saline ammonia (S_FSA=${S_FSA}) not allowed`;
    if(S_OP   <  0) throw `Error: orthophosphate (S_OP=${S_OP}) not allowed`;
    if(S_NOx  <  0) throw `Error: nitrate/nitrite (S_NOx=${S_NOx}) not allowed`;
    if(X_OHO  <  0) throw `Error: ordinary heterotrophic organisms (X_OHO=${X_OHO}) not allowed`;
    if(X_PAO  <  0) throw `Error: polyphosphate accumulating organisms (X_PAO=${X_PAO}) not allowed`;

    //inputs and default values
    this.Q = isNaN(Q) ? 25 : Q; //ML/d | flowrate
    this.components={
      S_VFA : isNaN(S_VFA )? 50  : S_VFA ,//mg/L | Biodegradable   Soluble     Organics (BSO) (volatile fatty acids)
      S_FBSO: isNaN(S_FBSO)? 115 : S_FBSO,//mg/L | Biodegradable   Soluble     Organics (BSO) (fermentable organics)
      X_BPO : isNaN(X_BPO )? 440 : X_BPO ,//mg/L | Biodegradable   Particulate Organics (BPO)
      X_UPO : isNaN(X_UPO )? 100 : X_UPO ,//mg/L | Unbiodegradable Particulate Organics (UPO)
      S_USO : isNaN(S_USO )? 45  : S_USO ,//mg/L | Unbiodegradable Soluble     Organics (USO)
      X_iSS : isNaN(X_iSS )? 60  : X_iSS ,//mg/L | Inert Suspended Solids (sand)
      S_FSA : isNaN(S_FSA )? 39.1: S_FSA ,//mg/L | Inorganic Free Saline Ammonia (NH4)
      S_OP  : isNaN(S_OP  )? 7.28: S_OP  ,//mg/L | Inorganic OrthoPhosphate (PO4)
      S_NOx : isNaN(S_NOx )? 0   : S_NOx ,//mg/L | Inorganic Nitrite and Nitrate (NO2 + NO3) (not part of TKN)
      X_OHO : isNaN(X_OHO )? 0   : X_OHO ,//mg/L | Ordinary Heterotrophic Organisms (expressed as COD) influent OHO should always be 0 (model assumption)
      X_PAO : isNaN(X_PAO )? 0   : X_PAO ,//mg/L | Polyphosphate Accumulating Organisms (expressed as COD) influent PAO should always be 0 (model assumption)
    };
    this.mass_ratios={
      /*----+------------------+----------------+-----------------+-----------------+
      |     | COD              | C              | N               | P               |
      +-----+------------------+----------------+-----------------+-----------------*/
      /*VFA*/ f_CV_VFA : 1.0667, f_C_VFA : 0.400, f_N_VFA : 0.0000, f_P_VFA : 0.0000, // BSO
      /*FBS*/ f_CV_FBSO: 1.4200, f_C_FBSO: 0.471, f_N_FBSO: 0.0464, f_P_FBSO: 0.0118, // BSO
      /*BPO*/ f_CV_BPO : 1.5230, f_C_BPO : 0.498, f_N_BPO : 0.0323, f_P_BPO : 0.0072, // BPO
      /*UPO*/ f_CV_UPO : 1.4810, f_C_UPO : 0.518, f_N_UPO : 0.1000, f_P_UPO : 0.0250, // UPO
      /*USO*/ f_CV_USO : 1.4930, f_C_USO : 0.498, f_N_USO : 0.0366, f_P_USO : 0.0000, // USO
      /*OHO*/ f_CV_OHO : 1.4810, f_C_OHO : 0.518, f_N_OHO : 0.1000, f_P_OHO : 0.0250, // Ordinary Heterotrophic Organisms
      ///*ANO*/ f_CV_ANO : 1.4810, f_C_ANO : 0.518, f_N_ANO : 0.1000, f_P_ANO : 0.0250, // Ammonia Oxidizing Organisms
      /*PAO*/ f_CV_PAO : 1.4810, f_C_PAO : 0.518, f_N_PAO : 0.1000, f_P_PAO : 0.3800, // Phosphate Accumulating Organisms
      /*----------------------------------------------------------------------------*/
    };
  };

  //update a state variable value. example -> sv.set("S_VFA",10);
  set(key, newValue){
    if(this.components[key]===undefined) throw `key "${key}" not found`;
    if(typeof newValue != 'number')      throw `key "${key}" newValue ("${newValue}") is not a number`;
    if(newValue < 0)                     throw `key "${key}" newValue ("${newValue}") is negative`;
    //update state variable value
    this.components[key]=newValue;
  };

  //calculate complete fractionation for [COD, TKN, TP, TOC,TSS]
  get totals(){
    let mr=this.mass_ratios;//alias for code reduction
    let co=this.components; //alias for code reduction

    //COD fractions (Chemical Oxygen Demand)
      let bsCOD = co.S_VFA + co.S_FBSO; //bio   + soluble COD
      let usCOD = co.S_USO;             //unbio + soluble COD
      let bpCOD = co.X_BPO;             //bio   + partic  COD
      let upCOD = co.X_UPO;             //unbio + partic  COD
      let  bCOD = bsCOD + bpCOD;        //bio             COD
      let  uCOD = usCOD + upCOD;        //unbio           COD
      let  sCOD = bsCOD + usCOD;        //soluble         COD
      let  pCOD = bpCOD + upCOD;        //partic          COD
      let Total_COD = bsCOD + usCOD + bpCOD + upCOD + co.X_OHO + co.X_PAO;
      let COD={
        total: Total_COD,
        bCOD,  uCOD,  sCOD,  pCOD,
        bsCOD, usCOD, bpCOD, upCOD,
        active: co.X_OHO + co.X_PAO,
      };

    //TOC all fractions (Total Organic Carbon)
      let bsOC = co.S_VFA * mr.f_C_VFA / mr.f_CV_VFA + co.S_FBSO * mr.f_C_FBSO / mr.f_CV_FBSO; //bio   + soluble OC
      let usOC = co.S_USO * mr.f_C_USO / mr.f_CV_USO;                                          //unbio + soluble OC
      let bpOC = co.X_BPO * mr.f_C_BPO / mr.f_CV_BPO;                                          //bio   + partic  OC
      let upOC = co.X_UPO * mr.f_C_UPO / mr.f_CV_UPO;                                          //unbio + partic  OC
      let  bOC = bsOC + bpOC;                                                                  //bio             OC
      let  uOC = usOC + upOC;                                                                  //unbio           OC
      let  sOC = bsOC + usOC;                                                                  //soluble         OC
      let  pOC = bpOC + upOC;                                                                  //partic          OC
      let actOC = co.X_OHO * mr.f_C_OHO / mr.f_CV_OHO + //OC in active biomass (OHO)
                  co.X_PAO * mr.f_C_PAO / mr.f_CV_PAO;  //OC in active biomass (PAO)

      let Total_TOC = bsOC + usOC + bpOC + upOC + actOC;
      let TOC={
        total:Total_TOC,
        bOC,  uOC,  sOC,  pOC,
        bsOC, usOC, bpOC, upOC,
        active: actOC,
      };

    //TKN all fractions (Organic Nitrogen (ON) + Inorganic Free Saline Ammonia (FSA))
      let bsON = co.S_VFA * mr.f_N_VFA / mr.f_CV_VFA + co.S_FBSO * mr.f_N_FBSO / mr.f_CV_FBSO; //bio   + soluble ON
      let usON = co.S_USO * mr.f_N_USO / mr.f_CV_USO;                                          //unbio + soluble ON
      let bpON = co.X_BPO * mr.f_N_BPO / mr.f_CV_BPO;                                          //bio   + partic  ON
      let upON = co.X_UPO * mr.f_N_UPO / mr.f_CV_UPO;                                          //unbio + partic  ON
      let  bON = bsON + bpON;                                                                  //bio             ON
      let  uON = usON + upON;                                                                  //unbio           ON
      let  sON = bsON + usON;                                                                  //soluble         ON
      let  pON = bpON + upON;                                                                  //partic          ON
      let actON = co.X_OHO * mr.f_N_OHO / mr.f_CV_OHO+ //ON in active biomass (OHO)
                  co.X_PAO * mr.f_N_PAO / mr.f_CV_PAO; //ON in active biomass (PAO)
      let Total_TKN = co.S_FSA + bsON + usON + bpON + upON + actON;
      let TKN={
        total:Total_TKN,
        FSA:co.S_FSA,
        ON:sON+pON,
        bON,  uON,  sON,  pON,
        bsON, usON, bpON, upON,
        active: actON,
      }

    //TP all fractions (Organic P (OP) + Inorganic Phosphate (PO4))
      let bsOP = co.S_VFA * mr.f_P_VFA / mr.f_CV_VFA + co.S_FBSO * mr.f_P_FBSO / mr.f_CV_FBSO; //bio   + soluble OP
      let usOP = co.S_USO * mr.f_P_USO / mr.f_CV_USO;                                          //unbio + soluble OP
      let bpOP = co.X_BPO * mr.f_P_BPO / mr.f_CV_BPO;                                          //bio   + partic  OP
      let upOP = co.X_UPO * mr.f_P_UPO / mr.f_CV_UPO;                                          //unbio + partic  OP
      let  bOP = bsOP + bpOP;                                                                  //bio             OP
      let  uOP = usOP + upOP;                                                                  //unbio           OP
      let  sOP = bsOP + usOP;                                                                  //soluble         OP
      let  pOP = bpOP + upOP;                                                                  //partic          OP
      let actOP = co.X_OHO * mr.f_P_OHO / mr.f_CV_OHO + //OP in active biomass (OHO)
                  co.X_PAO * mr.f_P_PAO / mr.f_CV_PAO;  //OP in active biomass (PAO)

      let Total_TP = co.S_OP + bsOP + usOP + bpOP + upOP + actOP;
      let TP={
        total:Total_TP,
        PO4:co.S_OP,
        OP:sOP+pOP,
        bOP,  uOP,  sOP,  pOP,
        bsOP, usOP, bpOP, upOP,
        active: actOP,
      };

    //TSS all fractions (Volatile Suspended Solids (VSS) + inert Suspended Solids (iSS))
      let bVSS      = co.X_BPO / mr.f_CV_BPO; //bio   VSS
      let uVSS      = co.X_UPO / mr.f_CV_UPO; //unbio VSS

      let actVSS    = co.X_OHO / mr.f_CV_OHO + //OHO VSS active biomass
                      co.X_PAO / mr.f_CV_PAO;  //PAO VSS active biomass

      let Total_VSS = bVSS + uVSS + actVSS;   //total VSS
      let Total_TSS = Total_VSS + co.X_iSS;   //total TSS
      let TSS={
        total: Total_TSS,
        iSS:   co.X_iSS,
        VSS:   Total_VSS,
        bVSS,
        uVSS,
        active: actVSS,
      };

    //pack components
    return {COD,TKN,TP,TOC,TSS};
  };

  //convert components and totals (mg/L) to mass fluxes (kg/d)
  get fluxes(){
    let components={};
    let totals={};

    //components
    Object.entries(this.components).forEach(([key,value])=>{
      components[key]=this.Q*value;
    });

    //totals
    Object.entries(this.totals).forEach(([group_name,group])=>{
      totals[group_name]={};
      Object.entries(group).forEach(([key,val])=>{
        totals[group_name][key]=this.Q*val;
      });
    });

    return {components, totals};
  }

  //create summary table (concentrations and fluxes) for important components
  get summary(){
    let totals = this.totals;
    let fluxes = this.fluxes;
    return {
      Q: this.Q,
      COD: [totals.COD.total,      fluxes.totals.COD.total],  //chemical oxygen demand
      TKN: [totals.TKN.total,      fluxes.totals.TKN.total],  //total kjeldahl nitrogen
      NH4: [totals.TKN.FSA,        fluxes.totals.TKN.FSA],    //inorganic nitrogen (NH4, ammonia)
      NOx: [this.components.S_NOx, fluxes.components.S_NOx],  //nitrate (NO3) and nitrite (NO2) is not TKN
      TP:  [totals.TP.total,       fluxes.totals.TP.total],   //total phosphorus
      PO4: [totals.TP.PO4,         fluxes.totals.TP.PO4],     //inorganic phosphorus
      VSS: [totals.TSS.VSS,        fluxes.totals.TSS.VSS],    //volatile suspended solids
      iSS: [totals.TSS.iSS,        fluxes.totals.TSS.iSS],    //inorganic suspended solids
      TSS: [totals.TSS.total,      fluxes.totals.TSS.total],  //total suspended solids
      TOC: [totals.TOC.total,      fluxes.totals.TOC.total],  //total organic carbon
    }
  }

  //add up 2 state variable objects
  combine(sv){
    //new state variables empty object
    let new_sv = new State_Variables(0,0,0,0,0,0,0,0,0,0,0);
    //new flowrate
    let Q = this.Q + sv.Q;
    new_sv.Q = Q;
    //new concentrations: mass flux divided by the new Q
    Object.keys(this.components).forEach(key=>{
      let mass=0;
      mass += this.Q * this.components[key];
      mass += sv.Q   * sv.components[key];
      new_sv.set(key,mass/Q);
    });
    return new_sv;
  }

  static get info(){
    return {
      Q : {unit:"ML/d", descr:"flowrate"},
      components:{
        S_VFA :{unit:"mg/L as COD", descr:"Biodegradable Soluble Organics (BSO) (volatile fatty acids)"},
        S_FBSO:{unit:"mg/L as COD", descr:"Biodegradable Soluble Organics (BSO) (fermentable organics)"},
        X_BPO :{unit:"mg/L as COD", descr:"Biodegradable Particulate Organics (BPO)"},
        X_UPO :{unit:"mg/L as COD", descr:"Unbiodegradable Particulate Organics (UPO)"},
        S_USO :{unit:"mg/L as COD", descr:"Unbiodegradable Soluble Organics (USO)"},
        X_iSS :{unit:"mg/L as SS",  descr:"Inert Suspended Solids (sand)"},
        S_FSA :{unit:"mg/L as N",   descr:"Inorganic Free Saline Ammonia (NH4)"},
        S_OP  :{unit:"mg/L as P",   descr:"Inorganic OrthoPhosphate (PO4)"},
        S_NOx :{unit:"mg/L as N",   descr:"Inorganic Nitrite and Nitrate (NO2 + NO3) (not part of TKN)"},
        X_OHO :{unit:"mg/L as COD", descr:"Ordinary Heterotrophic Organisms (expressed as COD) influent OHO should always be 0 (model assumption)"},
        X_PAO :{unit:"mg/L as COD", descr:"Polyphosphate Accumulating Organisms (expressed as COD) influent PAO should always be 0 (model assumption)"},
      },
      mass_ratios:{
        f_CV_VFA :{unit:"gCOD/gVSS",descr:"S_VFA/VSS  mass ratio"},
        f_C_VFA  :{unit:"gC/gVSS",  descr:"S_VFA/C    mass ratio"},
        f_N_VFA  :{unit:"gN/gVSS",  descr:"S_VFA/N    mass ratio"},
        f_P_VFA  :{unit:"gP/gVSS",  descr:"S_VFA/P    mass ratio"},
        f_CV_FBSO:{unit:"gCOD/gVSS",descr:"S_FBSO/VSS mass ratio"},
        f_C_FBSO :{unit:"gC/gVSS",  descr:"S_FBSO/C   mass ratio"},
        f_N_FBSO :{unit:"gN/gVSS",  descr:"S_FBSO/N   mass ratio"},
        f_P_FBSO :{unit:"gP/gVSS",  descr:"S_FBSO/P   mass ratio"},
        f_CV_BPO :{unit:"gCOD/gVSS",descr:"X_BPO/VSS  mass ratio"},
        f_C_BPO  :{unit:"gC/gVSS",  descr:"X_BPO/C    mass ratio"},
        f_N_BPO  :{unit:"gN/gVSS",  descr:"X_BPO/N    mass ratio"},
        f_P_BPO  :{unit:"gP/gVSS",  descr:"X_BPO/P    mass ratio"},
        f_CV_UPO :{unit:"gCOD/gVSS",descr:"X_UPO/VSS  mass ratio"},
        f_C_UPO  :{unit:"gC/gVSS",  descr:"X_UPO/C    mass ratio"},
        f_N_UPO  :{unit:"gN/gVSS",  descr:"X_UPO/N    mass ratio"},
        f_P_UPO  :{unit:"gP/gVSS",  descr:"X_UPO/P    mass ratio"},
        f_CV_USO :{unit:"gCOD/gVSS",descr:"S_USO/VSS  mass ratio"},
        f_C_USO  :{unit:"gC/gVSS",  descr:"S_USO/C    mass ratio"},
        f_N_USO  :{unit:"gN/gVSS",  descr:"S_USO/N    mass ratio"},
        f_P_USO  :{unit:"gP/gVSS",  descr:"S_USO/P    mass ratio"},
        f_CV_OHO :{unit:"gCOD/gVSS",descr:"X_OHO/VSS  mass ratio"},
        f_C_OHO  :{unit:"gC/gVSS",  descr:"X_OHO/C    mass ratio"},
        f_N_OHO  :{unit:"gN/gVSS",  descr:"X_OHO/N    mass ratio"},
        f_P_OHO  :{unit:"gP/gVSS",  descr:"X_OHO/P    mass ratio"},
        //f_CV_ANO :{unit:"gCOD/gVSS",descr:"X_ANO/VSS  mass ratio"},
        //f_C_ANO  :{unit:"gC/gVSS",  descr:"X_ANO/C    mass ratio"},
        //f_N_ANO  :{unit:"gN/gVSS",  descr:"X_ANO/N    mass ratio"},
        //f_P_ANO  :{unit:"gP/gVSS",  descr:"X_ANO/P    mass ratio"},
        f_CV_PAO :{unit:"gCOD/gVSS",descr:"X_PAO/VSS  mass ratio"},
        f_C_PAO  :{unit:"gC/gVSS",  descr:"X_PAO/C    mass ratio"},
        f_N_PAO  :{unit:"gN/gVSS",  descr:"X_PAO/N    mass ratio"},
        f_P_PAO  :{unit:"gP/gVSS",  descr:"X_PAO/P    mass ratio"},
      },
    }
  }
}

//export class
try{module.exports=State_Variables}catch(e){}

/*tests*/{
  //test 1: print totals and fluxes
  (function(){
    return
    let s = new State_Variables(1,1,0,0,0,0,0,0,0,0);
    console.log("=== Inputs (components) (mg/L) ==="); console.log(s.components);
    console.log("=== Summary (mg/L & kg/d) ===");      console.log(s.summary);
    console.log("=== Totals (mg/L) ===");              console.log(s.totals);
    console.log("=== Fluxes (kg/d) ===");              console.log(s.fluxes);
  })();

  //test 2: combine 2 state variables and check result
  (function(){
    return
    let s1 = new State_Variables(10,2,2,2,2,2,2,2,2,2);
    let s2 = new State_Variables(10,1,1,1,1,1,1,1,1,1);
    let s3 = s1.combine(s2);
    console.log(s1.summary);
    console.log(s2.summary);
    console.log(s3.summary);
    console.log(s3.components);
  })();

  //test 3: example from george ekama (raw ww + set ww)
  (function(){
    return
    /*
    [inputs]                    [outputs]
    S_VFA_inf:         50,      Total_COD_raw:  1151,
    S_FBSO_inf:        186,     Total_C_raw:    383.4286,
    S_USO_inf:         58,      Total_TKN_raw:  90.0039,
    S_FSA_inf:         59.6,    Total_TP_raw:   20.0795,
    S_OP_inf:          14.15,   Total_VSS_raw:  565.4983,
    X_BPO_non_set_inf: 301,     Total_TSS_raw:  665.4983,
    X_BPO_set_inf:     406,     Total_COD_set:  615,
    X_UPO_non_set_inf: 20,      Total_C_set:    205.2029,
    X_UPO_set_inf:     130,     Total_TKN_set:  71.8958,
    X_iSS_raw_inf:     100,     Total_TP_set:   16.4455,
    X_iSS_set_inf:     34,      Total_VSS_set:  211.1406,
    ............................Total_TSS_set:  245.1406 */
    //create 2 manual scenarios: (1) raw ww, (2) settled ww
    //syntax--------------------(Q   VFA FBSO  BPO UPO USO iSS   FSA     OP NOx OHO)
    let sv = new State_Variables(25,  50, 186, 707,  0, 58,  0, 59.6, 14.15,  0,  0);
    console.log('---raw ww---'); sv.set("X_BPO",707); sv.set("X_UPO",150); sv.set("X_iSS",100); console.log(sv.summary);
    console.log('---set ww---'); sv.set('X_BPO',301); sv.set('X_UPO',20);  sv.set('X_iSS',34);  console.log(sv.summary);
  })();
}
