function setUpCameraApp(url){
    if (QB && QB.Phone && QB.Phone.Functions && QB.Phone.Data.currentApplication === null) {
        QB.Phone.Functions.Close();
    }
}