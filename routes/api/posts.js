const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const passport  = require('passport');

// Post model
const Post = require("../../models/Post");

//Profile Model

const Profile = require("../../models/Profile")

// Validation
const validatePostInput = require('../../validation/post');
const { profile_url } = require("gravatar");
const { remove } = require("../../models/Post");
const post = require("../../validation/post");

router.get("/test", (req, res) => res.json({ msg: "posts works" }));

//@route    Get api/posts
//@desc     Get posts
//@access   public 

router.get('/', (req, res) => {
    Post.find()
        .sort({ date: -1})
        .then(posts => res.json(posts))
        .catch(err => res.status(404).json({ nopostsfound: 'No posts found '}));
});

//@route    Get api/posts/:id
//@desc     Get posts by id
//@access   public 

router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(post => res.json(post))
        .catch(err => res.status(404).json({ nopostfound: 'No post found with submitted Id'}));
});

//@route    POST api/posts
//@desc     Create posts
//@access   Private
router.post('/', passport.authenticate('jwt', {session: false}), (req, res) => {
    const {errors, isValid} = validatePostInput(req.body);
    //check validation
    if(!isValid){
        return res.status(400).json(errors);
    }
    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar, 
        user: req.user.id
    });
    
    newPost.save().then(post => res.json(post));
});

//@route    Delete api/posts/:id
//@desc     delete post
//@access   Private

router.delete('/:id', passport.authenticate('jwt', {session: false}),
(req, res) => {
    Profile.findOne({ user: req.user.id})
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    //Check Post Owner
                    if(post.user.toString() !== req.user.id){
                        return res.status(401).json({ notauthorized: 'User not authorized'});
                    }

                    //Delete
                    post.remove().then(() => res.json({ success: true}));
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found' }));
        })
})

//@route    Post api/posts/like/:id
//@desc     Like post
//@access   Private

router.post('/like/:id', passport.authenticate('jwt', {session: false}),
(req, res) => {
    Profile.findOne({ user: req.user.id})
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0){
                        return res.status(400).json({ alreadyliked: 'User already like this post'});
                    }

                    // Add user id to likes array
                    post.likes.unshift({ user: req.user.id });

                    post.save().then(post => res.json(post));
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found' }));
        });
});

//@route    Post api/posts/like/:id
//@desc     Unike post
//@access   Private

router.post('/unlike/:id', passport.authenticate('jwt', {session: false}),
(req, res) => {
    Profile.findOne({ user: req.user.id})
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    if(post.likes.filter(like => like.user.toString() === req.user.id).length === 0){
                        return res.status(400).json({ notliked: 'You have not yet liked this post'});
                    }

                    // Get remove index
                    const removeIndex = post.likes
                        .map(item => item.user.toString())
                        .indexOf(req.user.id);

                    // Splice out of array
                    post.likes.splice(removeIndex, 1);

                    //save
                    post.save().then(post => res.json(post));
                })
                .catch(err => res.status(404).json({ postnotfound: 'No post found' }));
        });
});

//@route    Post api/posts/comment/:id
//@desc     Add comment to post
//@access   Private

router.post('/comment/:id', passport.authenticate('jwt', {session: false}),
    (req, res) => {
        const {errors, isValid} = validatePostInput(req.body);

    //check validation
    if(!isValid){
        return res.status(400).json(errors);
    }
        
        Post.findById(req.params.id).then(post => {
            
            const newComment = { 
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id
            }
            

            // Add comments to array
            post.comments.unshift(newComment);

            // Save

            post.save().then(post => res.json(post))
        })
        .catch(err => res.status(404).json({ postnotfound: "No post found"}));
    });


   
//@route    Delete api/posts/comment/:id/:comment_id
//@desc     Delete comment on post
//@access   Private

router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', { session: false }),
    (req, res) => {
       
        Post.findById(req.params.id)
        .then(post => {
            // Check to see if comment exists
            if(
                post.comments.filter(
                    comment => comment._id.toString() === req.params.comment_id
                ).length === 0
                
            ){
                return res
                .status(404)
                .json({ commentnotexists: 'Comment does not exist'});

            } 

            //Get remove index

            const removeIndex = post.comments.map(item => item._id.toString()
            ).indexOf(req.params.comment_id); 

            //Splice comments out of array
            post.comments.splice(removeIndex, 1);

            post.save().then(post => res.json(post));
        
        })
        .catch(err => res.status(404).json({ postnotfound: "No post found"}));
    });


module.exports = router;
