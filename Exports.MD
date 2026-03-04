qb-phone exports

# Crypto (Server side)

```

exports['z-phone']:RemoveCrypto(src, type, amount)

exports['z-phone']:hasEnough(src, type, amount)

exports['z-phone']:AddCrypto(src, type, amount)

```

# Employment (Server side)

```

exports['z-phone']:hireUser(Job, CID, grade)

exports['z-phone']:fireUser(Job, CID)

```

# Groups (Server Side)
```

exports['z-phone']:NotifyGroup(group, msg, type)

exports['z-phone']:pNotifyGroup(group, header, msg, icon, colour, length)

exports['z-phone']:CreateBlipForGroup(groupID, name, data)

exports['z-phone']:RemoveBlipForGroup(groupID, name)

exports['z-phone']:GetGroupByMembers(src)

exports['z-phone']:getGroupMembers(groupID)

exports['z-phone']:getGroupSize(groupID)

exports['z-phone']:GetGroupLeader(groupID)

exports['z-phone']:DestroyGroup(groupID)

exports['z-phone']:isGroupLeader(src, groupID)

--------------------------------------------------

exports['z-phone']:setJobStatus(groupID, status, stages)

exports['z-phone']:getJobStatus(groupID)

exports['z-phone']:resetJobStatus(groupID)

--------------------------------------------------

exports['z-phone']:isGroupTemp(groupID)

exports['z-phone']:CreateGroup(src, name, password)

```

# Notifications (Client side)

```

exports['z-phone']:PhoneNotification(title, text, icon, color, timeout, accept, deny)

```

# Twitter (Server side)

```

local function escape_str(s)
	return s
end

local TweetData = {
    firstName = PhoneData.PlayerData.charinfo.firstname,
    lastName = PhoneData.PlayerData.charinfo.lastname,
    citizenid = PhoneData.PlayerData.citizenid,
    message = escape_str(data.Message):gsub("[%<>\"()\'$]",""),
    time = data.Date,
    tweetId = "TWEET-"..math.random(11111111, 99999999),
    type = data.type,
    url = URL
}

exports['z-phone']:AddNewTweet(TweetData)

```
