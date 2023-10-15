import { LinkdingApi} from './linkding';
import { getConfiguration, isConfigurationComplete } from "./configuration";
import YAML from "js-yaml";
import _ from "lodash";
import {createBookmark, getBookmarkBarId, getBookmarkSubTree, removeBookmark} from "./browser";

function walkTree(bookmarks, node, collector) {
    const bookmarksToRemove = [];
    if(!node) return;
    for (const tagTreeNode of node) {
        if (tagTreeNode.name == null) continue;
        const tags = !tagTreeNode.tag ? [] : tagTreeNode.tag.split(" ");
        let subPath = _.find(collector.children, x => x.name === tagTreeNode.name);
        if(!subPath) {
            subPath = {name: "" + tagTreeNode.name, bookmarks: [], children: []};
            collector.children.push(subPath);
        }
        const filteredBookmarks = !tagTreeNode.tag ? bookmarks : _.filter(bookmarks, x => _.intersection(x.tag_names, tags).length === tags.length);
        walkTree(filteredBookmarks, tagTreeNode.children, subPath);
        bookmarksToRemove.push(...filteredBookmarks);
        if (!tagTreeNode.tag) continue;
        for (const bookmark of filteredBookmarks) {
            if (!bookmark.url) continue;
            subPath.bookmarks.push({
                title: "" + (bookmark.title || bookmark.website_title),
                url: "" + bookmark.url
            });
        }
    }
    _.pull(bookmarks, ...bookmarksToRemove);
}

async function writeTree(browserNodeId, linkdingNode) {
    const browserNode = (await getBookmarkSubTree(browserNodeId))[0];
    const children = _.map(browserNode.children, function (x) {
        return {
            id: x.id,
            url: x.url,
            title: x.title
        };
    });
    const bookMarksToAdd = _.filter(linkdingNode.bookmarks, x => !_.some(children, y => y.url === x.url));
    const bookMarksToRemove = _.filter(children, x => x.url && !_.some(linkdingNode.bookmarks, y => y.url === x.url));
    const foldersToRemove = _.filter(children, x => !x.url && !_.some(linkdingNode.children, y => x.title === y.name));
    bookMarksToRemove.push(...foldersToRemove);

    for (const bookmark of bookMarksToAdd) {
        console.log("Adding bookmark {}", bookmark);
        await createBookmark({
            parentId: browserNode.id,
            title: bookmark.title,
            url: bookmark.url
        });
    }
    for (const bm of bookMarksToRemove) {
        console.log("Removing bookmark {}", bm);
        await removeBookmark(bm.id);
    }
    for (const child of linkdingNode.children) {
        let subnodeId;
        const subNode = _.find(children, x => x.title === child.name);
        if (!subNode) {
            const sn = await createBookmark({
                parentId: browserNodeId,
                title: child.name
            });
            subnodeId = sn.id;
        } else {
            subnodeId = subNode.id;
        }
        console.log("Entering folder {}", child.name);
        await writeTree(subnodeId, child);
        console.log("Leaving folder {}", child.name);
    }
}

export async function sync() {
    const configuration = await getConfiguration();
    const hasCompleteConfiguration = isConfigurationComplete(configuration);
    let response;

    // Skip if extension is not configured or URL is invalid
    if (!hasCompleteConfiguration) {
        return null;
    }

    const api = new LinkdingApi(configuration);
    const tagTree = YAML.load(configuration.syncYaml);
    const output = {
        name: "root",
        bookmarks: [],
        children: []
    };
    const allBookmarks = [];
    let nextUrl = `${configuration.baseUrl}/api/bookmarks/`;
    do {
        response = await api.get(nextUrl);
        allBookmarks.push(...response.results);
        nextUrl = response.next;
    } while (response.next != null);
    walkTree(allBookmarks, tagTree.tagTree, output);
    await writeTree(getBookmarkBarId(), output);
}
