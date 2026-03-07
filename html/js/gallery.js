function setUpGalleryData(Images){
    $(".gallery-images").html("");
    if (Images != null) {
        $.each(Images, function(i, image){
            var Element = '<div class="gallery-image"><img src="'+image.image+'" alt="'+image.citizenid+'" class="tumbnail"></div>';

            $(".gallery-images").append(Element);
            $("#image-"+i).data('ImageData', image);
        });
    }
}

$(document).on('click', '.tumbnail', function(e){
    e.preventDefault();
    let source = $(this).attr('src')
    $(".gallery-homescreen").animate({
        left: 30+"vw"
    }, 200);
    $(".gallery-detailscreen").animate({
        left: 0+"vw"
    }, 200);
    SetupImageDetails(source);
});

$(document).on('click', '.image', function(e){
    e.preventDefault();
    let source = $(this).attr('src')
    QB.Screen.popUp(source)
});


$(document).on('click', '#delete-button', function(e){
    e.preventDefault();
    let source = $('.image').attr('src')

    setTimeout(() => {
        QB.Phone.NUI.postLegacy("DeleteImage", {image:source}, function(Hashtags) {
            setTimeout(()=>{
                $('#return-button').click()
                QB.Phone.NUI.postLegacy("GetGalleryData", {}, function(data) {
                    setTimeout(()=>{
                            setUpGalleryData(data);

                    },200)
                });
            },200)
        })

    }, 200);
});


function SetupImageDetails(Image){
    $('#imagedata').attr("src", Image);
}
let postImageUrl="";
function SetupPostDetails(){
}


$(document).on('click', '#make-post-button', function(e){
    e.preventDefault();
    let source = $('#imagedata').attr('src')
    postImageUrl=source

    $(".gallery-detailscreen").animate({
        left: 30+"vw"
    }, 200);
    $(".gallery-postscreen").animate({
        left: 0+"vw"
    }, 200);
    SetupPostDetails();
});

$(document).on('click', '#gallery-coppy-button', function(e){
    e.preventDefault();
    let source = $('#imagedata').attr('src')
    copyToClipboard(source)
});

const copyToClipboard = str => {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
 };

$(document).on('click', '#return-button', function(e){
    e.preventDefault();

    $(".gallery-homescreen").animate({
        left: 0+"vw"
    }, 200);
    $(".gallery-detailscreen").animate({
        left: -30+"vw"
    }, 200);
});

$(document).on('click', '#returndetail-button', function(e){
    e.preventDefault();
    returnDetail();

});

function returnDetail(){
    $(".gallery-detailscreen").animate({
        left: 0+"vw"
    }, 200);
    $(".gallery-postscreen").animate({
        left: -30+"vw"
    }, 200);
}


$(document).on('click', '#tweet-button', function(e){
    e.preventDefault();
    var TweetMessage = $("#new-textarea").val();
    var imageURL = postImageUrl
    if (TweetMessage != "") {
        var CurrentDate = new Date();
        QB.Phone.NUI.postLegacy("PostNewTweet", {
            Message: TweetMessage,
            Date: CurrentDate,
            Picture: QB.Phone.Data.MetaData.profilepicture,
            url: imageURL
        }, function(Tweets) {
            QB.Phone.Notifications.LoadTweets(Tweets);
        });
        var TweetMessage = $("#new-textarea").val(' ');
        QB.Phone.NUI.postLegacy("GetHashtags", {}, function(Hashtags) {
            QB.Phone.Notifications.LoadHashtags(Hashtags)
        })
        returnDetail()
    } else {
        QB.Phone.Notifications.Add("fab fa-twitter", "Twitter", "Fill a message!", "#1DA1F2");
    };
    $('#tweet-new-url').val("");
    $("#tweet-new-message").val("");
});


$(document).on('click', '#advert-button', function(e){
    e.preventDefault();
    var Advert = $("#new-textarea").val();
    let picture = postImageUrl;

    if (Advert !== "") {
        $(".advert-home").animate({
            left: 0+"vw"
        });
        $(".new-advert").animate({
            left: -30+"vw"
        });
        if (!picture){
            QB.Phone.NUI.postLegacy("PostAdvert", {
                message: Advert,
                url: null
            });
            returnDetail()
        }else {
            QB.Phone.NUI.postLegacy("PostAdvert", {
                message: Advert,
                url: picture
            });
            returnDetail()
        }
        $("#new-textarea").val(' ');
    } else {
        QB.Phone.Notifications.Add("fas fa-ad", "Advertisement", "You can\'t post an empty ad!", "#ff8f1a", 2000);
    }
});

