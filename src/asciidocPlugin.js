import asciiDoctorLib from 'asciidoctor.js'
import _ from 'lodash'
import moment from 'moment'
import slugify from 'hubpress-core-slugify'//'./utils/slugify'

const asciidoctor = asciiDoctorLib();
const opal = asciidoctor.Opal;
const processor = asciidoctor.Asciidoctor(false);
const options = opal.hash2(
  ['safe', 'attributes'],
{safe: 'unsafe', attributes: ['showtitle!','imagesdir=/images', 'icons=font']});

function splitMore(asciidocContent) {
  let parts = asciidocContent.split('pass::[more]');
  return {
    excerpt: parts[0],
    full: parts.join('')
  }
}

function convert (asciidocContent) {
  let parts = splitMore(asciidocContent);
  let excerpt = processor.$load(parts.excerpt, options);
  let doc = processor.$load(parts.full, options);
  let value = {
    attributes: doc.attributes,
    excerpt: excerpt.$convert(),
    html: doc.$convert()
  }
  return value;
}

export function asciidocPlugin (hubpress) {

  hubpress.on('requestRenderingDocuments', (opts) => {

    const posts = (opts.data.documents.posts || []).map((post) => {
      const _post = Object.assign({}, post, convert(post.content), {
        content: post.content
      });


      let original = _.pick(_post, 'attributes', 'author', 'html', 'tags', 'content', 'name', 'path', 'sha');

      _post.title = original.title = original.attributes.map['doctitle'] ;
      _post.image = original.image = original.attributes.map['hp-image'] ;
      _post.tags = original.tags = original.attributes.map['hp-tags'] && original.attributes.map['hp-tags'].split(',') ;
      _post.url = original.url = opts.data.config.urls.getPostUrl(original.name);

      let _postToSave = Object.assign({}, _post, {original: original});
      _postToSave.original.published_at = _postToSave.published_at = original.name.split('-').slice(0,3).join('-');

      return _postToSave;
    })

    const mergeDocuments = Object.assign({}, opts.data.documents, {posts});
    const data = Object.assign({}, opts.data, {documents: mergeDocuments});
    return Object.assign({}, opts, {data});
  })

  hubpress.on('requestRenderingPost', (opts) => {

    let refreshedPost = convert(opts.data.post.content);
     //Object.assign(opts.data, {document: convertedContent});
    refreshedPost._id = opts.data.post._id;
    console.log('refreshedPost', refreshedPost);
    refreshedPost.title = refreshedPost.attributes.map['doctitle'];
    refreshedPost.image = refreshedPost.attributes.map['hp-image'] ;
    refreshedPost.tags = refreshedPost.attributes.map['hp-tags'] && refreshedPost.attributes.map['hp-tags'].split(',');
    refreshedPost.published_at = refreshedPost.attributes.map['published_at'] || refreshedPost.published_at || moment().format('YYYY-MM-DD');
    let altTitle = refreshedPost.attributes.map['hp-alt-title'];
    refreshedPost.name = slugify(refreshedPost.published_at + '-' + (altTitle || refreshedPost.title)) +'.adoc';
    refreshedPost.url = opts.state.application.config.urls.getPostUrl(refreshedPost.name);

    const mergedPost = Object.assign({}, opts.data.post, refreshedPost);
    const data = Object.assign({}, opts.data, {post: mergedPost});
    return Object.assign({}, opts, {data});
  })

}
