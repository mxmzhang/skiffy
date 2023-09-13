var express = require('express')
var app = express();

app.use(express.static('static_files'))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var hbs = require('hbs')
hbs.registerPartials(__dirname + '/views/partials', function (err) {});
app.set('view engine','hbs')

var {Pool} = require('pg')
var pool = new Pool({
    connectionString: process.env.HEROKU_POSTGRESQL_BRONZE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(require('cookie-parser')());

var cookieSession  = require('cookie-session')
app.use( cookieSession ({
  name: 'premium',
  keys: ['superdupersecret'],
}));

const uuid = require('uuid')

app.get('/about', function(req, res) {
    res.render('about')
})

function getPosts(req, res, next) {
    var genres = []
    var cats = []
    if('aa' in req.query) {
        genres.push(1)
    }
    if('c' in req.query) {
        genres.push(2)
    }
    if('f' in req.query) {
        genres.push(3)
    }
    if('hf' in req.query) {
        genres.push(4)
    }
    if('ho' in req.query) {
        genres.push(5)
    }
    if('hu' in req.query) {
        genres.push(6)
    }
    if('m' in req.query) {
        genres.push(7)
    }
    if('sf' in req.query) {
        genres.push(8)
    }

    if('ssff' in req.query) {
        cats.push(9)
    }
    if('p' in req.query) {
        cats.push(10)
    }
    if('ne' in req.query) {
        cats.push(11)
    }
    if('sp' in req.query) {
        cats.push(12)
    }
    if('e' in req.query) {
        cats.push(13)
    }

    var whereStr = ``
    //var catStr = ``
    if(genres.length > 0) {
        whereStr = ` WHERE (`
        for(i = 0; i < genres.length; i++) {
            if(i == 0) {
                whereStr = whereStr+ `t.tag_id = `+genres[i]
            } else {
                whereStr = whereStr + ` OR t.tag_id = `+genres[i]
            }
        }
        whereStr = whereStr + `)`
        console.log('genre WHERE statement: '+ whereStr)
    }
    if(cats.length > 0) {
        if(whereStr.length === 0) {
            whereStr = ` WHERE (`
        } else {
            whereStr = whereStr + ` AND (`
        }
        for(i = 0; i < cats.length; i++) {
            if(i == 0) {
                whereStr = whereStr+`t.tag_id = `+cats[i]
            } else {
                whereStr = whereStr + ` OR t.tag_id = `+cats[i]
            }
        }
        whereStr = whereStr+`)`
        console.log('category WHERE statement: '+ whereStr)
    }
    var sql = `SELECT s.post_id, s.title, s.author, s.date, s.content, s.likes, s.likesimg, s.edit_url,
        STRING_AGG(t.tag_name, ',') tags, STRING_AGG(t.url, ',') tag_urls
        FROM skiffyposts s
        INNER JOIN posttags p USING (post_id)
        INNER JOIN tags t USING (tag_id)`+whereStr+`
        GROUP BY post_id
        ORDER BY post_id ASC;`
    pool.query(sql, function(err, results) {
        if(err) {
            console.log('selecting posts error: ')
            console.log(err)
        } else {
            console.log("results")
            console.log(results.rows)
            res.locals.postArr = results.rows.reverse()
        }
        next();
    });
}
// function addLikeSVGCol(req, res, next) {
//     var sql = `ALTER TABLE skiffyposts ADD likesimg varchar(256);`
//     pool.query(sql, function(err, results) {
//         if(err) {
//             console.log('add likeimg column err: ')
//             console.log(err)
//         } else {
//             console.log('likesimg col added')
//             sql = `UPDATE skiffyposts SET likesimg = 'unchecked';`
//             pool.query(sql, function(err2, results2){
//                 if(err2) {
//                     console.log('update likesimg err: ')
//                     console.log(err2)
//                 } else {
//                     console.log('likesimg updated')
//                 }
//                 next()
//             })
//         }
//     })
// }
// function addURLCol(req, res, next) {
//     var sql = `UPDATE tags AS t SET tag_id = a.tag_id, url = a.url
//         FROM (VALUES (1, 'aa=true'), (2, 'c=true'), (3, 'f=true'), (4, 'hf=true'), (5, 'ho=true'),
//         (6, 'hu=true'), (7, 'm=true'), (8, 'sf=true'), (9, 'ssff=true'), (10, 'p=true'),
//         (11, 'ne=true'), (12, 'sp=true'), (13, 'e=true'))
//         AS a(tag_id, url)
//         WHERE a.tag_id = t.tag_id;`
//     pool.query(sql, function(err2, result2) {
//         if(err2) {
//             console.log('update tags error: ')
//             console.log(err2)
//         } else {
//             console.log('tag urls updated')
//         }
//         next()
//     })
// }
// function createComTable(req, res, next) {
//     pool.query(`ALTER SEQUENCE comments_com_id_seq START WITH 1000;`, function(err2, results2) {
//         if(err2) {
//             console.log('restart comments err: ')
//             console.log(err2)
//         }
//         else {
//             console.log('comments serial restarted')
//         }
//         next()
//     })

// }

// function updateTableAgain(req, res, next) {
//     var sql = `ALTER TABLE skiffyposts ADD content_short varchar(450), ADD edit_url varchar(256);`
//     pool.query(sql, function(err, result) {
//         if(err) {
//             console.log('alter table error: ')
//             console.log(err)
//         } else {
//             console.log('altered table!')
//         }
//         next()
//     })
// }
function delContentShort(req, res, next) {
    var sql = `ALTER TABLE skiffyposts DROP COLUMN content_short;`
    pool.query(sql, function(err, result) {
        if(err) {
            console.log('drop content short err')
            console.log(err)
        } else {
            console.log('drop content short success')
        }
        next()
    })
}

app.get('/', getPosts, function(req, res) {
    console.log('on main page')
    // delete req.session.likedPosts;
    if(!('likedPosts' in req.session)) {
        req.session.likedPosts = []
    }

    // console.log('date: ')
    // console.log(res.locals.postArr[0].date.toString())
    var arr = res.locals.postArr

    for(i = 0; i < arr.length; i++) {
        var dateStr = arr[i].date.toString()
        arr[i].date = dateStr.substring(0, dateStr.length-47)

        arr[i].tags = arr[i].tags.split(',')
        arr[i].tag_urls = arr[i].tag_urls.split(',')

        if(arr[i].content.length > 2000) {
            arr[i].lengthshortened = true
            arr[i].shortcontent = arr[i].content.substring(0, 2000)
        } else {
            arr[i].lengthshortened = false
        }

        // arr[i].content = arr[i].content.replaceAll('\r\n', '<br>')
        // console.log("content: "+arr[i].content)
        //console.log(arr[i].tag_urls)
        for(j = 0; j < arr[i].tags.length; j++) {
            var obj = {
                'name' : arr[i].tags[j],
                'url' : arr[i].tag_urls[j]
            }
            arr[i].tags[j] = obj
        }
    }

    //console.log(arr)
    var likesArr = req.session.likedPosts
    console.log(likesArr)
    for(i = 0; i < likesArr.length; i++) {
        console.log(arr[likesArr[i]-1])
        arr[likesArr[i]-1].likesimg = 'checked'
    }
    //console.log(arr)

    var obj = {
        'postArr' : arr
    }

    // pool.query('DELETE FROM skiffyposts;DELETE FROM posttags;', function(err, results) {
    //     if(err) {
    //         console.log('delete error: ')
    //         console.log(err)
    //     }
    //     pool.query('ALTER SEQUENCE skiffyposts_post_id_seq RESTART', function(err, results) {
    //         if(err) {
    //             console.log('restart id error:')
    //             console.log(err)
    //         }
    //         res.render('index')
    //     })
    // })

    res.render('index', obj)
})

app.get('/submit', function(req, res) {
    res.render('postform')
})


function organizeFormData(req, res, next) {
    console.log("processing form responses")
    res.locals.tags = `[`

    if('name' in req.body) {
        res.locals.author = req.body.name;
    }
    if('title' in req.body) {
        res.locals.title = req.body.title
    }
    if('aa' in req.body) {
        res.locals.tags = res.locals.tags+1+`,`
    }
    if('c' in req.body) {
        res.locals.tags = res.locals.tags+2+`,`
    }
    if('f' in req.body) {
        res.locals.tags = res.locals.tags+3+`,`
    }
    if('hf' in req.body) {
        res.locals.tags = res.locals.tags+4+`,`
    }
    if('ho' in req.body) {
        res.locals.tags = res.locals.tags+5+`,`
    }
    if('hu' in req.body) {
        res.locals.tags = res.locals.tags+6+`,`
    }
    if('m' in req.body) {
        res.locals.tags = res.locals.tags+7+`,`
    }
    if('sf' in req.body) {
        res.locals.tags = res.locals.tags+8+`,`
    }
    if('category' in req.body) {
        if(req.body.category === 'short story/flash fiction') {
            res.locals.tags = res.locals.tags+9+`,`
        } else if(req.body.category === 'poetry') {
            res.locals.tags = res.locals.tags+10+`,`
        } else if(req.body.cateogry === 'novel excerpt') {
            res.locals.tags = res.locals.tags+11+`,`
        } else if(req.body.category === 'screenplay') {
            res.locals.tags = res.locals.tags+12+`,`
        } else if(req.body.category === 'essay') {
            res.locals.tags = res.locals.tags+13+`,`
        }
    }

    res.locals.tags = res.locals.tags.substring(0, res.locals.tags.length-1)+`]`
    console.log(`tags array: `+res.locals.tags)

    if('category' in req.body) {
        res.locals.cat = req.body.category
    }
    if('submission' in req.body) {
        res.locals.content = req.body.submission
    }

    const date = new Date();
    res.locals.curDate = "'"+date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+"'"
    next()
}
function insertPost(req, res, next) {
    res.locals.uuid = uuid.v1()
    // console.log(typeof(res.locals.uuid))
    pool.query("INSERT INTO skiffyposts VALUES (DEFAULT, $1, $2,"+res.locals.curDate+", $3, 0, 'unchecked', '"+res.locals.uuid+"');", 
        [res.locals.title, res.locals.author, res.locals.content], function(err, result) {
            console.log('done')
            if(err) {
                console.log('error')
                console.log(err)
            }
            next()
    })
}
function countCurPosts(req, res, next) {
    pool.query("SELECT count(*) FROM skiffyposts AS count", function(err, result) {
        if(err) {
            console.log('counting posts error: ')
            console.log(err)
        } else {
            res.locals.count = result.rows[0].count
            console.log('count: '+res.locals.count)
        }
        next()
    })
}
app.post('/form-response', organizeFormData, insertPost, countCurPosts, function(req, res) {
    //var sql = "INSERT INTO skiffyposts VALUES (DEFAULT, 'wassup', 'elaine', '2022-07-05', 'hiiii what is up', 1);"
    
    var sql = `DO $$
        DECLARE
        array_int int[]:= array`+res.locals.tags+`;
        var int;
        BEGIN
        FOREACH var IN ARRAY array_int
            LOOP
            INSERT INTO posttags(post_id, tag_id) VALUES(`+res.locals.count+`, var);
            END LOOP;
        END$$;`

    console.log('posttags insert query: ')
    console.log(sql)

    pool.query(sql, function(err, result) {
        if(err) {
            console.log('posttags insert error: ')
            console.log(err)
        } else {
            console.log('posttags insert done')
            console.log(result)
        }
        pool.query('SELECT * FROM posttags', function(err2, result2) {
            if(err2) {
                console.log('select posttags error: ')
                console.log(err2)
            } else {
                // console.log('posttags: ')
                console.log(result2.rows)
            }
            res.render('editurl', {'url':res.locals.uuid})
        })
    })
})

function updateSQLLikes(req, res, next) {
    var sql
    var numberBool = parseInt(req.query.likesupped)
    // console.log(req.query.likesupped)
    // console.log(typeof req.query.likesupped)
    // console.log("if statement test")
    console.log(numberBool === 1)
    if(numberBool === 1) {
        console.log("likes being increased")
        sql = `UPDATE skiffyposts SET likes = likes + 1 WHERE post_id = `+req.query.post
        if('likedPosts' in req.session) {
            req.session.likedPosts.push(parseInt(req.query.post))
            // console.log('req.session.likedposts: ')
            // console.log(req.session.likedPosts)
        }
    } else {
        console.log("likes being decreased")
        sql = `UPDATE skiffyposts SET likes = likes - 1 WHERE post_id = `+req.query.post
        req.session.likedPosts = req.session.likedPosts.filter(function(n) {
            return n !== parseInt(req.query.post)
        })
        // console.log('req.session.likedposts: ')
        // console.log(req.session.likedPosts)
    }
    pool.query(sql, function(err, result) {
        if(err) {
            console.log('updating likes error: ')
            console.log(err)
        } else {
            console.log('likes updated')
        }
        next()
    })
}
app.get('/likesUpdater', updateSQLLikes, function(req, res) {
    var select = `SELECT likes FROM skiffyposts WHERE post_id = `+req.query.post
    pool.query(select, function(err2, result2) {
        if(err2) {
            console.log('selecting likes error: ')
            console.log(err2)
        } else {
            console.log('likes: '+result2.rows[0].likes)
            var obj = {
                'postid' : req.query.post,
                'updatedlikes' : result2.rows[0].likes
            }
            res.json(obj)
        }
    })
})

app.get('/post/:extra', countCurPosts, function(req, res) {
    console.log('extra: '+req.params.extra)
    if(Number.isInteger(parseInt(req.params.extra)) && req.params.extra>=1 && req.params.extra<=res.locals.count) {
        console.log('number is int')
        var sql =  `SELECT s.post_id, s.title, s.author, s.date, s.content, s.likes, s.likesimg, s.edit_url,
        STRING_AGG(t.tag_name, ',') tags, STRING_AGG(t.url, ',') tag_urls
        FROM skiffyposts s
        INNER JOIN posttags p USING (post_id)
        INNER JOIN tags t USING (tag_id)
        WHERE s.post_id =`+req.params.extra+`
        GROUP BY post_id`
        pool.query(sql, function(err, result) {
            if(err) {
                console.log('selecting single post err')
                console.log(err)
            } else {
                console.log('select single post no err')
                arr = result.rows
                var dateStr = arr[0].date.toString()
                arr[0].date = dateStr.substring(0, dateStr.length-47)

                arr[0].tags = arr[0].tags.split(',')
                arr[0].tag_urls = arr[0].tag_urls.split(',')

                var likesArr = req.session.likedPosts
                if(likesArr.indexOf(req.params.extra) >= 0) {
                    arr[0].likesimg = 'checked'
                }

                for(j = 0; j < arr[0].tags.length; j++) {
                    var obj = {
                        'name' : arr[0].tags[j],
                        'url' : arr[0].tag_urls[j]
                    }
                    arr[0].tags[j] = obj
                }

                var obj = {
                    'postArr': arr
                }
                res.render('index', obj)
            }
        })
    } else {
        pool.query(`SELECT post_id, content FROM skiffyposts WHERE edit_url = $1;`, [req.params.extra], function(err, result) {
            console.log('else')
            if(err) {
                console.log("selecting uuid match err")
                console.log(err)
            } else {
                console.log(result.rows)
                if(result.rows.length > 0) {
                    console.log('render edit')
                    res.render('edit', {'id':result.rows[0].post_id, 'content':result.rows[0].content})
                } else {
                    console.log('not rendering edit')
                    res.redirect('https://skiffy.herokuapp.com/')
                }
            }
        })
    }
})

app.post('/edit-content', function(req, res) {
    var sql = `UPDATE skiffyposts SET content = $1 WHERE post_id = `+parseInt(req.body.post_id)+`;`
    pool.query(sql, [req.body.submission], function(err, result) {
        if(err) {
            console.log('update submission err')
            console.log(err)
        } else {
            console.log(req.body.post_id+' successfully updated')
        }
        res.redirect('https://skiffy.herokuapp.com/')
    })
})

var listener = app.listen(process.env.PORT || 8080, process.env.HOST || "0.0.0.0", function() {
    console.log("Express server started");
});