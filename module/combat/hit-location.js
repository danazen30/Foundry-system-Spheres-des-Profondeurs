export async function rollHitLocation() {

    // jet de localisation
    const roll = await (new Roll("1d12")).roll();

    const result = roll.total;

    let location;

    switch(result){

        case 1:
            location = "head";
            break;

        case 2:
        case 3:
            location = "rightArm";
            break;

        case 4:
        case 5:
            location = "leftArm";
            break;

        case 6:
        case 7:
        case 8:
            location = "body";
            break;

        case 9:
        case 10:
            location = "rightLeg";
            break;

        case 11:
        case 12:
            location = "leftLeg";
            break;
    }

    return {
        roll: roll,
        location: location
    };

}