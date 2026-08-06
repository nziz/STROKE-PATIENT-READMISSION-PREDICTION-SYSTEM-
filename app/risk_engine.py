from typing import Dict, Any, List

def evaluate_maternal_risk(
    bleeding: bool,
    fever: bool,
    headache: bool,
    swelling: bool,
    abdominal_pain: bool,
    reduced_fetal_movement: bool,
    systolic_bp: int = None,
    diastolic_bp: int = None
) -> Dict[str, Any]:
    """
    Evaluates maternal health risks based on danger signs and blood pressure.
    Returns:
        {
            "risk_level": "LOW" | "MEDIUM" | "HIGH",
            "recommendation_en": str,
            "recommendation_rw": str,
            "flags": List[str],
            "rationales": List[str]
        }
    """
    flags = []
    rationales = []
    
    # Check Blood Pressure thresholds
    bp_high_severe = False
    bp_high_moderate = False
    
    if systolic_bp is not None and diastolic_bp is not None:
        if systolic_bp >= 160 or diastolic_bp >= 110:
            bp_high_severe = True
            flags.append("Severe Hypertension")
            rationales.append(f"Blood pressure ({systolic_bp}/{diastolic_bp} mmHg) is critically high, indicating risk of severe pre-eclampsia or eclampsia.")
        elif systolic_bp >= 140 or diastolic_bp >= 90:
            bp_high_moderate = True
            flags.append("Moderate Hypertension")
            rationales.append(f"Blood pressure ({systolic_bp}/{diastolic_bp} mmHg) is elevated. Needs monitoring for gestational hypertension.")
            
    # Check Symptoms
    if bleeding:
        flags.append("Vaginal Bleeding")
        rationales.append("Vaginal bleeding during pregnancy is a critical emergency (placental abruption, placenta praevia, or miscarriage risk).")
    if abdominal_pain:
        flags.append("Severe Abdominal Pain")
        rationales.append("Severe abdominal pain can indicate ectopic pregnancy, pre-eclampsia, or uterine rupture.")
    if fever:
        flags.append("High Fever")
        rationales.append("Fever suggests active infection (malaria, urinary tract infection, or amniotic infection) which can cause preterm labor.")
    if headache:
        flags.append("Severe Headache / Blurred Vision")
        rationales.append("Severe persistent headache or vision changes indicate elevated intracranial pressure associated with pre-eclampsia.")
    if swelling:
        flags.append("Face/Hand Swelling")
        rationales.append("Sudden swelling of face and hands is a major sign of pre-eclampsia (fluid retention).")
    if reduced_fetal_movement:
        flags.append("Reduced Fetal Movement")
        rationales.append("Decreased movement of the baby suggests fetal distress and requires immediate assessment.")

    
    # Escalating 'reduced_fetal_movement' to HIGH risk to protect fetal life.
    is_high = (
        bleeding or 
        abdominal_pain or 
        bp_high_severe or 
        reduced_fetal_movement or
        (headache and swelling)
    )
    
    # MEDIUM RISK criteria
    is_medium = (
        fever or 
        headache or 
        swelling or 
        bp_high_moderate
    )
    
    if is_high:
        risk_level = "HIGH"
        recomm_en = "CRITICAL RISK! Go to the nearest health post or health center immediately. Medical evaluation is required urgently."
        recomm_rw = "IMBURA GIKOMEYE! Genda ku Kigo Nderabuzima cyangwa kwa muganga ako kanya. Ukeneye guhangana n'abaganga bwangu!"
    elif is_medium:
        risk_level = "MEDIUM"
        recomm_en = "MODERATE RISK: Consult your Community Health Worker (CHW) or visit the health post within 24 hours. Rest and monitor symptoms closely."
        
        recomm_rw = "IKIBAZO CYOROHEJE: Genda kwa muganga cyangwa ubone Umujyanama w'Ubuzima wawe mu masaha 24. Uruhuke kandi ukomeze gukurikiranira hafi ibimenyetso."
    else:
        risk_level = "LOW"
        recomm_en = "LOW RISK: Pregnancy health looks stable. Continue routine prenatal care (ANC) visits. Promptly report any new symptoms."
        recomm_rw = "UBUZIMA BURASANZWE: Ubuzima bw'inda buragaragara neza. Komeza kwipimisha bisanzwe (ANC). Niba ubonye ikindi kimenyetso, hita ubimenyesha."

    return {
        "risk_level": risk_level,
        "recommendation_en": recomm_en,
        "recommendation_rw": recomm_rw,
        "flags": flags,
        "rationales": rationales
    }
